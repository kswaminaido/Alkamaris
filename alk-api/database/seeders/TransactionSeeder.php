<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\CashFlowCustomer;
use App\Models\CashFlowPacker;
use App\Models\GeneralInfoCustomer;
use App\Models\GeneralInfoPacker;
use App\Models\RevenueCustomer;
use App\Models\RevenuePacker;
use App\Models\ShippingDetailsCustomer;
use App\Models\ShippingDetailsPacker;
use App\Models\Transaction;
use App\Models\TransactionNote;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class TransactionSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('role', UserRole::Admin->value)->first();
        if (! $admin) {
            return;
        }

        $salesUsers = User::query()->where('role', UserRole::Sales->value)->get();
        if ($salesUsers->isEmpty()) {
            $salesUsers = collect([
                User::factory()->create([
                    'name' => 'Sales One',
                    'email' => 'sales1@example.com',
                    'role' => UserRole::Sales->value,
                    'phone_number' => '9000000001',
                    'address' => 'Sales address 1',
                    'registration_number' => 'REG-SALES-0001',
                ]),
                User::factory()->create([
                    'name' => 'Sales Two',
                    'email' => 'sales2@example.com',
                    'role' => UserRole::Sales->value,
                    'phone_number' => '9000000002',
                    'address' => 'Sales address 2',
                    'registration_number' => 'REG-SALES-0002',
                ]),
            ]);
        }

        for ($i = 1; $i <= 60; $i++) {
            $bookingNo = 'SIF'.str_pad((string) (2602000 + $i), 7, '0', STR_PAD_LEFT);
            if (Transaction::query()->where('booking_no', $bookingNo)->exists()) {
                continue;
            }

            $salesPerson = $salesUsers->random();
            $issueDate = Carbon::now()->subDays(rand(5, 120));

            $transaction = Transaction::query()->create([
                'booking_no' => $bookingNo,
                'booking_mode' => rand(0, 1) === 1 ? 'trade_commission' : 'qc_services',
                'issue_date' => $issueDate->toDateString(),
                'sales_person_id' => $salesPerson->id,
                'product_origin' => fake()->randomElement(['India (Singapore)', 'India (UAE)', 'Vietnam']),
                'destination' => fake()->randomElement(['AQABA, JORDAN', 'MARIN, SPAIN', 'LIVORNO, ITALY']),
                'category' => fake()->randomElement(['Food Grade', 'Feed Grade']),
                'type' => fake()->randomElement(['Trade', 'Service']),
                'country' => fake()->randomElement(['India', 'Singapore', 'UAE']),
                'container_primary' => fake()->randomElement(['20 FT', '40 FT', 'Bulk']),
                'certified' => (bool) rand(0, 1),
                'net_margin' => rand(1000, 50000) / 100,
                'created_by_user_id' => $admin->id,
            ]);

            GeneralInfoCustomer::query()->create([
                'transaction_id' => $transaction->id,
                'customer' => fake()->company(),
                'attention' => fake()->randomElement(['Accounts', 'Purchase']),
                'ship_to' => fake()->city(),
                'buyer' => fake()->company(),
                'buyer_number' => (string) rand(100000, 999999),
                'end_customer' => fake()->company(),
                'prices_customer_type' => fake()->randomElement(['USD/MT', 'INR/MT']),
                'prices_customer_rate' => rand(200, 3000) / 10,
                'payment_customer_term' => fake()->randomElement(['Advance', '30 Days']),
                'payment_customer_type' => fake()->randomElement(['LC', 'TT']),
                'payment_customer_advance_percent' => rand(0, 50),
                'description' => fake()->randomElement(['NO COMM.', 'STANDARD TERMS']),
                'tolerance' => fake()->randomElement(['+/- 1%', '+/- 2%']),
                'marketing_fee' => (bool) rand(0, 1),
            ]);

            GeneralInfoPacker::query()->create([
                'transaction_id' => $transaction->id,
                'vendor' => fake()->company(),
                'packer_name' => fake()->company(),
                'packer_number' => (string) rand(1000, 9999),
                'packed_by' => fake()->randomElement(['Factory', 'Vendor']),
                'prices_packer_type' => fake()->randomElement(['USD/MT', 'INR/MT']),
                'prices_packer_rate' => rand(200, 3000) / 10,
                'payment_packer_term' => fake()->randomElement(['Advance', '30 Days']),
                'payment_packer_type' => fake()->randomElement(['LC', 'TT']),
                'payment_packer_advance_percent' => rand(0, 50),
                'description' => fake()->randomElement(['NO COMM.', 'STANDARD TERMS']),
                'tolerance' => fake()->randomElement(['+/- 1%', '+/- 2%']),
                'total_lqd_price' => rand(10000, 90000) / 100,
                'consignee' => fake()->company(),
            ]);

            RevenueCustomer::query()->create([
                'transaction_id' => $transaction->id,
                'total_selling_value' => rand(10000, 50000) / 10,
                'total_selling_currency' => 'USD',
                'commission_enabled' => (bool) rand(0, 1),
                'commission_percent' => rand(0, 15),
                'amount' => rand(5000, 15000) / 10,
                'amount_currency' => 'USD',
                'description' => fake()->randomElement(['NO COMM.', 'WITH COMMISSION']),
                'rebate_memo_amount' => rand(0, 3000) / 10,
                'rebate_memo_description' => fake()->words(3, true),
                'overcharge_sc_amount' => rand(0, 2000) / 10,
                'overcharge_sc_description' => fake()->words(3, true),
            ]);

            RevenuePacker::query()->create([
                'transaction_id' => $transaction->id,
                'total_buying_value' => rand(9000, 45000) / 10,
                'total_buying_currency' => 'USD',
                'commission_enabled' => (bool) rand(0, 1),
                'commission_percent' => rand(0, 15),
                'amount' => rand(4000, 12000) / 10,
                'amount_currency' => 'USD',
                'description' => fake()->randomElement(['NO COMM.', 'WITH COMMISSION']),
                'overcharge_sc_amount' => rand(0, 2000) / 10,
                'overcharge_sc_description' => fake()->words(3, true),
            ]);

            CashFlowCustomer::query()->create([
                'transaction_id' => $transaction->id,
                'date_advance' => $issueDate->copy()->addDays(rand(1, 10))->toDateString(),
                'amount_advance' => rand(1000, 10000) / 10,
                'date_balance' => $issueDate->copy()->addDays(rand(20, 60))->toDateString(),
                'amount_balance' => rand(1000, 10000) / 10,
            ]);

            CashFlowPacker::query()->create([
                'transaction_id' => $transaction->id,
                'date_advance' => $issueDate->copy()->addDays(rand(1, 10))->toDateString(),
                'amount_advance' => rand(1000, 10000) / 10,
                'date_balance' => $issueDate->copy()->addDays(rand(20, 60))->toDateString(),
                'amount_balance' => rand(1000, 10000) / 10,
            ]);

            ShippingDetailsCustomer::query()->create([
                'transaction_id' => $transaction->id,
                'lsd_min' => $issueDate->copy()->addDays(rand(10, 25))->toDateString(),
                'lsd_max' => $issueDate->copy()->addDays(rand(26, 45))->toDateString(),
                'presentation_days' => rand(10, 20),
                'lc_expiry' => $issueDate->copy()->addDays(rand(35, 70))->toDateString(),
                'req_eta' => $issueDate->copy()->addDays(rand(30, 75))->toDateString(),
            ]);

            ShippingDetailsPacker::query()->create([
                'transaction_id' => $transaction->id,
                'lsd_min' => $issueDate->copy()->addDays(rand(10, 25))->toDateString(),
                'lsd_max' => $issueDate->copy()->addDays(rand(26, 45))->toDateString(),
                'presentation_days' => rand(10, 20),
                'lc_expiry' => $issueDate->copy()->addDays(rand(35, 70))->toDateString(),
                'req_eta' => $issueDate->copy()->addDays(rand(30, 75))->toDateString(),
            ]);

            TransactionNote::query()->create([
                'transaction_id' => $transaction->id,
                'by_sales' => fake()->sentence(8),
            ]);
        }
    }
}
