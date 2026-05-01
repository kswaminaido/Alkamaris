<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'name' => 'Customer Alpha Trading',
                'phone_number' => '9000001001',
                'email' => 'customer.alpha@example.com',
                'address' => 'Mumbai, India',
                'registration_number' => 'CUS-ALPHA-001',
            ],
            [
                'name' => 'Customer Beta Foods',
                'phone_number' => '9000001002',
                'email' => 'customer.beta@example.com',
                'address' => 'Chennai, India',
                'registration_number' => 'CUS-BETA-002',
            ],
            [
                'name' => 'Customer Gamma Exports',
                'phone_number' => '9000001003',
                'email' => 'customer.gamma@example.com',
                'address' => 'Kochi, India',
                'registration_number' => 'CUS-GAMMA-003',
            ],
        ];

        foreach ($customers as $customer) {
            User::query()->updateOrCreate(
                ['email' => $customer['email']],
                [
                    ...$customer,
                    'role' => UserRole::Customer->value,
                    'password' => Hash::make('Password@123'),
                ],
            );
        }
    }
}
