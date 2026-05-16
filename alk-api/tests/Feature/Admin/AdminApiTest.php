<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\Config;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
