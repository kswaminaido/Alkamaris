<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();

        $configs = [
            'transaction_category' => ['Food Grade', 'Feed Grade', 'Industrial'],
            'transaction_type' => ['Trade', 'Service', 'Commission'],
            'transaction_container_size' => ['20 ft', '30 ft', '40 ft'],
            'transaction_container_load' => ['Full Load', 'Partial Load'],
            'transaction_certified' => ['Yes', 'No'],
            'customer_attention' => ['Accounts', 'Purchase', 'Logistics'],
            'customer_ship_to' => ['Main Warehouse', 'Port Facility', 'Client Yard'],
            'customer_buyer' => ['Buyer A', 'Buyer B', 'Buyer C'],
            'customer_end_customer' => ['Retail Group', 'Wholesale Group', 'Distributor X'],
            'customer_price_type' => ['USD/MT', 'INR/MT', 'SGD/MT'],
            'customer_payment_type' => ['LC', 'TT', 'CAD'],
            'customer_payment_term' => ['Advance', '30 Days', '60 Days'],
            'transaction_tolerance' => ['+/- 1%', '+/- 2%', '+/- 5%'],
            'packer_name' => ['Packer One', 'Packer Two', 'Packer Three'],
            'packer_packed_by' => ['Factory', 'Third Party', 'Packer'],
            'packer_price_type' => ['USD/MT', 'INR/MT', 'SGD/MT'],
            'packer_payment_type' => ['LC', 'TT', 'CAD'],
            'packer_payment_term' => ['Advance', '30 Days', '60 Days'],
            'packer_consignee' => ['Consignee A', 'Consignee B', 'Consignee C'],
            'transaction_currency' => ['USD', 'INR', 'SGD', 'EUR'],
        ];

        foreach ($configs as $type => $data) {
            $existing = DB::table('configs')->where('type', $type)->first();

            if ($existing) {
                DB::table('configs')
                    ->where('type', $type)
                    ->update([
                        'data' => json_encode($data, JSON_THROW_ON_ERROR),
                        'updated_at' => $now,
                    ]);
                continue;
            }

            DB::table('configs')->insert([
                'type' => $type,
                'data' => json_encode($data, JSON_THROW_ON_ERROR),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('configs')->whereIn('type', [
            'transaction_category',
            'transaction_type',
            'transaction_container_size',
            'transaction_container_load',
            'transaction_certified',
            'customer_attention',
            'customer_ship_to',
            'customer_buyer',
            'customer_end_customer',
            'customer_price_type',
            'customer_payment_type',
            'customer_payment_term',
            'transaction_tolerance',
            'packer_name',
            'packer_packed_by',
            'packer_price_type',
            'packer_payment_type',
            'packer_payment_term',
            'packer_consignee',
            'transaction_currency',
        ])->delete();
    }
};
