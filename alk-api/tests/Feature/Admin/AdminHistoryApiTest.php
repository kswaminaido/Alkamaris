<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\UsersEventLog;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminHistoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_read_last_five_days_of_history_in_descending_order(): void
    {
        $this->travelTo('2026-06-24 15:00:00');

        $admin = User::factory()->create(['name' => 'Admin User', 'role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin_token')->plainTextToken;

        $recent = UsersEventLog::query()->create([
            'user_id' => $admin->id,
            'user_name' => 'Admin User',
            'event_type' => 'User',
            'data' => ['action' => 'User updated', 'description' => 'User updated with ID 10'],
        ]);
        $recent->forceFill([
            'created_at' => '2026-06-24 14:55:00',
            'updated_at' => '2026-06-24 14:55:00',
        ])->save();

        $older = UsersEventLog::query()->create([
            'user_id' => $admin->id,
            'user_name' => 'Admin User',
            'event_type' => 'Transaction',
            'data' => ['action' => 'Transaction created', 'description' => 'Transaction created with ID 20'],
        ]);
        $older->forceFill([
            'created_at' => '2026-06-20 10:10:00',
            'updated_at' => '2026-06-20 10:10:00',
        ])->save();

        $expired = UsersEventLog::query()->create([
            'user_id' => $admin->id,
            'user_name' => 'Admin User',
            'event_type' => 'User',
            'data' => ['action' => 'Old event', 'description' => 'Old event'],
        ]);
        $expired->forceFill([
            'created_at' => '2026-06-18 09:00:00',
            'updated_at' => '2026-06-18 09:00:00',
        ])->save();

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/history');

        $response
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $recent->id)
            ->assertJsonPath('data.0.user_name', 'Admin User')
            ->assertJsonPath('data.0.description', 'User updated with ID 10')
            ->assertJsonPath('data.1.id', $older->id)
            ->assertJsonPath('pagination.current_page', 1)
            ->assertJsonPath('pagination.per_page', 20)
            ->assertJsonPath('pagination.total', 2);
    }

    public function test_admin_history_can_be_paginated(): void
    {
        $this->travelTo('2026-06-24 15:00:00');

        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin_token')->plainTextToken;

        for ($index = 1; $index <= 6; $index++) {
            $event = UsersEventLog::query()->create([
                'user_id' => $admin->id,
                'user_name' => $admin->name,
                'event_type' => 'User',
                'data' => ['action' => "Action {$index}", 'description' => "Action {$index}"],
            ]);
            $event->forceFill([
                'created_at' => CarbonImmutable::parse('2026-06-24 14:00:00')->addMinutes($index),
                'updated_at' => CarbonImmutable::parse('2026-06-24 14:00:00')->addMinutes($index),
            ])->save();
        }

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/history?per_page=5&page=2');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('pagination.current_page', 2)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonPath('pagination.per_page', 5)
            ->assertJsonPath('pagination.total', 6);
    }

    public function test_non_admin_cannot_read_history(): void
    {
        $salesUser = User::factory()->create(['role' => UserRole::Sales->value]);
        $token = $salesUser->createToken('sales_token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/history');

        $response->assertForbidden();
    }
}
