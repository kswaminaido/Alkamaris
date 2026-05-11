<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\Config;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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
            'phone_number' => '9876543210',
            'email' => 'test@example.com',
            'address' => 'Test address',
            'user_type' => UserRole::Packer->value,
            'registration_number' => 'REG-1001',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'token_type',
                    'access_token',
                    'user' => ['id', 'name', 'email', 'phone_number', 'address', 'registration_number', 'role'],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'role' => UserRole::Packer->value,
            'registration_number' => 'REG-1001',
            'is_active' => false,
        ]);
    }

    public function test_customer_can_register_with_firm_number(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Customer User',
            'phone_number' => '9998887776',
            'email' => 'customer@example.com',
            'address' => 'Customer address',
            'user_type' => UserRole::Customer->value,
            'firm_number' => 'FIRM-2002',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'customer@example.com',
            'role' => UserRole::Customer->value,
            'registration_number' => 'FIRM-2002',
        ]);
    }

    public function test_sales_cannot_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Sales User',
            'phone_number' => '9998887775',
            'email' => 'sales@example.com',
            'address' => 'Sales address',
            'user_type' => UserRole::Sales->value,
            'factory_approval_number' => 'FACT-3003',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user_type']);
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
                    'user' => ['id', 'name', 'email', 'phone_number', 'address', 'registration_number', 'role'],
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
            'registration_number' => 'REG-1001',
        ]);
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/auth/profile', [
                'name' => 'Updated User',
                'phone_number' => '9000000000',
                'email' => 'after@example.com',
                'address' => 'Updated address',
                'registration_number' => 'REG-2002',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Profile updated successfully.')
            ->assertJsonPath('data.email', 'after@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated User',
            'email' => 'after@example.com',
            'registration_number' => 'REG-2002',
        ]);
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
