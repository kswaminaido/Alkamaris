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
            ['data' => UserRole::values()],
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
}
