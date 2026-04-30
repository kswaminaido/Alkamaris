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
            ['data' => UserRole::registrableValues()],
        );

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'akhil@gmail.com',
            'role' => UserRole::Admin->value,
            'phone_number' => '9999999999',
            'address' => 'Default seeded admin address',
            'registration_number' => 'REG-ADMIN-00011',
            'password' => bcrypt('Password@123'),
        ]);

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'swami@gmail.com',
            'role' => UserRole::Admin->value,
            'phone_number' => '9999999999',
            'address' => 'Default seeded admin address',
            'registration_number' => 'REG-ADMIN-00011',
            'password' => bcrypt('Password@123'),
        ]);

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'maneesha@gmail.com',
            'role' => UserRole::Admin->value,
            'phone_number' => '9999999999',
            'address' => 'Default seeded admin address',
            'registration_number' => 'REG-ADMIN-00011',
            'password' => bcrypt('Password@123'),
        ]);

        $this->call([
            CustomerSeeder::class,
            VendorSeeder::class,
            TransactionSeeder::class,
        ]);
    }
}
