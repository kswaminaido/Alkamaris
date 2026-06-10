<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\Config;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Config::query()->updateOrCreate(
            ['type' => 'roles'],
            ['data' => UserRole::registrableValues()],
        );
    }

    public function test_packer_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'contact_name' => 'Test Contact',
            'phone_number' => '9876543210',
            'email' => 'test@example.com',
            'address' => 'Test address',
            'user_type' => UserRole::Packer->value,
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'token_type',
                    'access_token',
                    'user' => ['id', 'name', 'contact_name', 'email', 'phone_number', 'address', 'role'],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'contact_name' => 'Test Contact',
            'role' => UserRole::Packer->value,
            'is_active' => false,
        ]);
    }

    public function test_packer_registration_does_not_require_extra_details(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'contact_name' => 'Test Contact',
            'phone_number' => '9876543210',
            'email' => 'test@example.com',
            'address' => 'Test address',
            'user_type' => UserRole::Packer->value,
        ]);

        $response->assertCreated();
    }

    public function test_customer_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Customer User',
            'contact_name' => 'Customer Contact',
            'phone_number' => '9998887776',
            'email' => 'customer@example.com',
            'address' => 'Customer address',
            'user_type' => UserRole::Customer->value,
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'customer@example.com',
            'role' => UserRole::Customer->value,
        ]);
    }

    public function test_admin_logistics_and_accounts_registration_requires_password(): void
    {
        foreach ([UserRole::Admin, UserRole::Logistics, UserRole::Accounts] as $role) {
            $response = $this->postJson('/api/auth/register', [
                'name' => ucfirst($role->value) . ' User',
                'contact_name' => ucfirst($role->value) . ' Contact',
                'phone_number' => '9998887776',
                'email' => "{$role->value}@example.com",
                'address' => ucfirst($role->value) . ' address',
                'user_type' => $role->value,
            ]);

            $response
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['password', 'password_confirmation']);
        }
    }

    public function test_sales_registration_does_not_require_password(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Sales User',
            'contact_name' => 'Sales Contact',
            'phone_number' => '9998887776',
            'email' => 'sales@example.com',
            'address' => 'Sales address',
            'user_type' => UserRole::Sales->value,
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'sales@example.com',
            'role' => UserRole::Sales->value,
        ]);
    }

    public function test_admin_logistics_accounts_and_sales_can_register_with_confirmed_password(): void
    {
        foreach ([UserRole::Admin, UserRole::Logistics, UserRole::Accounts, UserRole::Sales] as $role) {
            $response = $this->postJson('/api/auth/register', [
                'name' => ucfirst($role->value) . ' User',
                'contact_name' => ucfirst($role->value) . ' Contact',
                'phone_number' => '9998887776',
                'email' => "{$role->value}@example.com",
                'address' => ucfirst($role->value) . ' address',
                'user_type' => $role->value,
                'password' => 'Password@123',
                'password_confirmation' => 'Password@123',
            ]);

            $response->assertCreated();

            $user = User::query()->where('email', "{$role->value}@example.com")->first();

            $this->assertNotNull($user);
            $this->assertTrue(Hash::check('Password@123', $user->password));
        }
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'Password@123',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'Password@123',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'token_type',
                    'access_token',
                    'user' => ['id', 'name', 'contact_name', 'email', 'phone_number', 'address', 'role'],
                ],
            ]);
    }

    public function test_inactive_user_cannot_login_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'inactive@example.com',
            'password' => 'Password@123',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'Password@123',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_user_cannot_login_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'Password@123',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'WrongPassword@123',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_get_profile(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');

        $response
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_authenticated_user_can_logout_and_token_is_revoked(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $logoutResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');

        $logoutResponse
            ->assertOk()
            ->assertJsonPath('message', 'Logged out successfully.');

        [$tokenId] = explode('|', $token);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => (int) $tokenId,
        ]);
    }

    public function test_authenticated_user_can_update_profile(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::Packer,
            'email' => 'before@example.com',
        ]);
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/auth/profile', [
                'name' => 'Updated User',
                'phone_number' => '9000000000',
                'email' => 'after@example.com',
                'address' => 'Updated address',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Profile updated successfully.')
            ->assertJsonPath('data.email', 'after@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated User',
            'email' => 'after@example.com',
        ]);
    }

    public function test_authenticated_user_can_update_authorization_images(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->post('/api/auth/profile/authorization', [
                'signature_image' => UploadedFile::fake()->image('signature.png', 240, 90),
                'stamp_image' => UploadedFile::fake()->image('stamp.jpg', 140, 140),
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Authorization images updated successfully.');

        $freshUser = $user->fresh();

        $this->assertNotNull($freshUser->authorization_signature_path);
        $this->assertNotNull($freshUser->authorization_stamp_path);
        Storage::disk('public')->assertExists($freshUser->authorization_signature_path);
        Storage::disk('public')->assertExists($freshUser->authorization_stamp_path);
    }

    public function test_authenticated_user_can_update_password(): void
    {
        $user = User::factory()->create([
            'password' => 'Password@123',
        ]);
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/auth/password', [
                'password' => 'NewPassword@123',
                'password_confirmation' => 'NewPassword@123',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Password updated successfully.');

        $this->assertTrue(Hash::check('NewPassword@123', $user->fresh()->password));
    }

    public function test_password_update_requires_confirmation(): void
    {
        $user = User::factory()->create([
            'password' => 'Password@123',
        ]);
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/auth/password', [
                'password' => 'NewPassword@123',
                'password_confirmation' => 'DifferentPassword@123',
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_revoked_token_cannot_access_protected_route(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        [$tokenId] = explode('|', $token);

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => (int) $tokenId,
        ]);

        $user->tokens()->whereKey((int) $tokenId)->delete();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => (int) $tokenId,
        ]);

        $unauthorizedResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');

        $unauthorizedResponse->assertUnauthorized();
    }
}
