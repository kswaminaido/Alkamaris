<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\Config;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class AdminApiTest extends TestCase
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

    public function test_admin_can_create_and_update_and_delete_config(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin_token')->plainTextToken;

        $storeResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/configs', [
                'type' => 'departments',
                'data' => ['sales', 'support'],
            ]);

        $storeResponse
            ->assertCreated()
            ->assertJsonPath('data.type', 'departments');

        $configId = $storeResponse->json('data.id');

        $updateResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/configs/{$configId}", [
                'type' => 'departments',
                'data' => ['sales', 'support', 'operations'],
            ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('data.data.2', 'operations');

        $deleteResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/configs/{$configId}");

        $deleteResponse->assertOk();
    }

    public function test_non_admin_cannot_access_admin_endpoints(): void
    {
        $salesUser = User::factory()->create(['role' => UserRole::Sales->value]);
        $token = $salesUser->createToken('sales_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/users');

        $response->assertForbidden();
    }

    public function test_logistics_can_read_booking_reference_data_but_cannot_modify_admin_resources(): void
    {
        Config::query()->create([
            'type' => 'container_types',
            'data' => ['20GP', '40HC'],
        ]);
        User::factory()->create([
            'name' => 'Customer One',
            'role' => UserRole::Customer->value,
        ]);

        $logisticsUser = User::factory()->create(['role' => UserRole::Logistics->value]);
        $token = $logisticsUser->createToken('logistics_token')->plainTextToken;

        $usersResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/users?roles=customer,packer,vendor&per_page=100');

        $usersResponse
            ->assertOk()
            ->assertJsonFragment(['name' => 'Customer One']);

        $configsResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/configs');

        $configsResponse
            ->assertOk()
            ->assertJsonFragment(['type' => 'container_types']);

        $storeResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/configs', [
                'type' => 'departments',
                'data' => ['sales', 'support'],
            ]);

        $storeResponse->assertForbidden();
    }

    public function test_admin_can_update_any_users_password(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $user = User::factory()->create([
            'role' => UserRole::Customer->value,
            'password' => Hash::make('OldPassword@123'),
        ]);
        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/users/{$user->id}", [
                'password' => 'NewPassword@123',
                'password_confirmation' => 'NewPassword@123',
            ]);

        $response->assertOk();

        $this->assertTrue(Hash::check('NewPassword@123', $user->fresh()->password));
    }

    public function test_admin_user_password_update_requires_confirmation(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $user = User::factory()->create([
            'role' => UserRole::Sales->value,
            'password' => Hash::make('OldPassword@123'),
        ]);
        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/users/{$user->id}", [
                'password' => 'NewPassword@123',
                'password_confirmation' => 'DifferentPassword@123',
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->assertTrue(Hash::check('OldPassword@123', $user->fresh()->password));
    }

    public function test_admin_can_bulk_create_users_from_csv_with_default_password_and_failures(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        User::factory()->create(['email' => 'existing@example.com']);
        $token = $admin->createToken('admin_token')->plainTextToken;
        $csv = implode("\n", [
            'Company Name / Name,Contact Name,Phone Number,User Type,Email ID,Address,Password,Confirm Password',
            'Acme Foods,Jane Buyer,1234567890,customer,new.customer@example.com,Main Street,,',
            'Duplicate Co,Dupe Contact,9999999999,customer,existing@example.com,Old Street,,',
        ]);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->post('/api/users/bulk', [
                'file' => UploadedFile::fake()->createWithContent('users.csv', $csv),
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.total_records', 2)
            ->assertJsonPath('data.successful_users', 1)
            ->assertJsonCount(1, 'data.failed_users');

        $created = User::query()->where('email', 'new.customer@example.com')->first();

        $this->assertNotNull($created);
        $this->assertSame('Acme Foods', $created->name);
        $this->assertTrue(Hash::check('Password@123', $created->password));
        $this->assertStringContainsString('already been taken', $response->json('data.failed_users.0.reason'));
    }
}
