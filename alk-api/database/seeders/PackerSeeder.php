<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PackerSeeder extends Seeder
{
    public function run(): void
    {
        $packers = [
            [
                'name' => 'Packer Prime Seafood',
                'phone_number' => '9000002001',
                'email' => 'packer.prime@example.com',
                'address' => 'Visakhapatnam, India',
                'registration_number' => 'PACK-PRIME-001',
            ],
            [
                'name' => 'Packer Delta Marine',
                'phone_number' => '9000002002',
                'email' => 'packer.delta@example.com',
                'address' => 'Mangalore, India',
                'registration_number' => 'PACK-DELTA-002',
            ],
            [
                'name' => 'Packer Nova Packers',
                'phone_number' => '9000002003',
                'email' => 'packer.nova@example.com',
                'address' => 'Tuticorin, India',
                'registration_number' => 'PACK-NOVA-003',
            ],
        ];

        foreach ($packers as $packer) {
            User::query()->updateOrCreate(
                ['email' => $packer['email']],
                [
                    ...$packer,
                    'role' => UserRole::Packer->value,
                    'password' => Hash::make('Password@123'),
                ],
            );
        }
    }
}
