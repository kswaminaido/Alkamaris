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
use App\Models\TransactionItem;
use App\Models\TransactionNote;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class TransactionSeeder extends Seeder
{
    private const ITEM_PRODUCTS = [
        'Frozen Vannamei White Shrimp',
        'Frozen Squid Tube',
        'Frozen Cuttlefish',
        'Frozen Breaded Shrimp',
    ];

    private const ITEM_STYLES = [
        'Raw Peeled & Deveined Tail On',
        'Whole Round',
        'Cleaned Tube',
        'Breaded Butterfly',
    ];

    private const ITEM_PACKINGS = [
        '5 x 2 LB(S) IQF',
        '10 x 1 KG',
        '20 x 500 G',
        '4 x 2.5 KG',
    ];

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

        $customerUsers = User::query()->where('role', UserRole::Customer->value)->pluck('name');
        $vendorUsers = User::query()->where('role', UserRole::Vendor->value)->pluck('name');

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
                'customer' => $customerUsers->random(),
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
                'vendor' => $vendorUsers->random(),
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

            foreach (range(0, rand(2, 4)) as $itemIndex) {
                $qtyBooking = rand(800, 4200);
                $sellingUnitPrice = rand(250, 900) / 100;
                $buyingUnitPrice = rand(200, 800) / 100;
                $weightValue = rand(1200, 45000) / 10;
                $commissionPacker = rand(0, 20) / 10;
                $commissionCustomer = rand(0, 20) / 10;

                TransactionItem::query()->create([
                    'transaction_id' => $transaction->id,
                    'product' => fake()->randomElement(self::ITEM_PRODUCTS),
                    'style' => fake()->randomElement(self::ITEM_STYLES),
                    'packing' => fake()->randomElement(self::ITEM_PACKINGS),
                    'media' => fake()->randomElement(['Retail', 'Food Service', 'Bulk']),
                    'notes' => fake()->sentence(),
                    'brand' => fake()->randomElement(['Plain+Sticker', 'Ocean Star', 'Blue Wave', 'Alkamaris']),
                    'secondary_packaging' => fake()->randomElement(['Carton', 'Master Carton', 'Inner Bag']),
                    'item_code' => strtoupper(fake()->bothify('ITM-###??')),
                    'customer_lot_no' => strtoupper(fake()->bothify('LOT-#####')),
                    'size' => fake()->randomElement(['13/15', '16/20', '21/25', 'U/10']),
                    'glaze_percentage' => rand(0, 20),
                    'total_weight_value' => $weightValue,
                    'total_weight_unit_category' => 'weight',
                    'total_weight_unit_slug' => fake()->randomElement(['pound', 'kilogram']),
                    'qty_value' => $qtyBooking,
                    'qty_unit' => fake()->randomElement(['CTN(S)', 'PCS', 'BAG(S)']),
                    'qty_booking' => $qtyBooking,
                    'selling_unit_price' => $sellingUnitPrice,
                    'selling_currency' => 'USD',
                    'selling_unit_category' => 'weight',
                    'selling_unit_slug' => 'pound',
                    'selling_total' => round($qtyBooking * $sellingUnitPrice, 2),
                    'lqd_qty' => $qtyBooking,
                    'lqd_price' => rand(200, 700) / 100,
                    'lqd_currency' => 'USD',
                    'lqd_unit_category' => 'weight',
                    'lqd_unit_slug' => 'pound',
                    'lqd_total' => round($qtyBooking * (rand(200, 700) / 100), 2),
                    'buying_unit_price' => $buyingUnitPrice,
                    'buying_currency' => 'USD',
                    'buying_unit_category' => 'weight',
                    'buying_unit_slug' => 'pound',
                    'buying_total' => round($qtyBooking * $buyingUnitPrice, 2),
                    'commission_from_packer' => $commissionPacker,
                    'commission_from_packer_unit_category' => 'weight',
                    'commission_from_packer_unit_slug' => 'kilogram',
                    'total_packer_commission' => round($weightValue * $commissionPacker, 2),
                    'commission_from_customer' => $commissionCustomer,
                    'commission_from_customer_unit_category' => 'weight',
                    'commission_from_customer_unit_slug' => 'kilogram',
                    'total_customer_commission' => round($weightValue * $commissionCustomer, 2),
                    'sort_order' => $itemIndex,
                ]);
            }
        }
    }
}
