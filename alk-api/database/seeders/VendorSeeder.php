<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class VendorSeeder extends Seeder
{
    public function run(): void
    {
        $vendors = [
            [
                'name' => 'Vendor Prime Seafood',
                'phone_number' => '9000002001',
                'email' => 'vendor.prime@example.com',
                'address' => 'Visakhapatnam, India',
                'registration_number' => 'VEN-PRIME-001',
            ],
            [
                'name' => 'Vendor Delta Marine',
                'phone_number' => '9000002002',
                'email' => 'vendor.delta@example.com',
                'address' => 'Mangalore, India',
                'registration_number' => 'VEN-DELTA-002',
            ],
            [
                'name' => 'Vendor Nova Packers',
                'phone_number' => '9000002003',
                'email' => 'vendor.nova@example.com',
                'address' => 'Tuticorin, India',
                'registration_number' => 'VEN-NOVA-003',
            ],
        ];

        foreach ($vendors as $vendor) {
            User::query()->updateOrCreate(
                ['email' => $vendor['email']],
                [
                    ...$vendor,
                    'role' => UserRole::Vendor->value,
                    'password' => Hash::make('Password@123'),
                ],
            );
        }
    }
}
