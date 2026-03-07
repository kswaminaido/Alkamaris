<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Config;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        Config::query()->updateOrCreate(
            ['type' => 'roles'],
            ['data' => UserRole::values()],
        );

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'role' => UserRole::Admin->value,
            'phone_number' => '9999999999',
            'address' => 'Default seeded admin address',
            'registration_number' => 'REG-ADMIN-0001',
        ]);
    }
}
