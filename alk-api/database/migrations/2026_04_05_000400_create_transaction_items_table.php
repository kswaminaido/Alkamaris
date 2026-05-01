<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->string('product')->nullable();
            $table->string('style')->nullable();
            $table->string('packing')->nullable();
            $table->string('media')->nullable();
            $table->text('notes')->nullable();
            $table->string('brand')->nullable();
            $table->string('secondary_packaging')->nullable();
            $table->string('item_code')->nullable();
            $table->string('customer_lot_no')->nullable();
            $table->string('size')->nullable();
            $table->decimal('glaze_percentage', 10, 2)->nullable();
            $table->decimal('total_weight_value', 15, 5)->nullable();
            $table->string('total_weight_unit_category', 50)->nullable();
            $table->string('total_weight_unit_slug', 100)->nullable();
            $table->decimal('qty_value', 15, 5)->nullable();
            $table->string('qty_unit', 50)->nullable();
            $table->decimal('qty_booking', 15, 5)->nullable();
            $table->decimal('selling_unit_price', 15, 5)->nullable();
            $table->string('selling_currency', 20)->nullable();
            $table->string('selling_unit_category', 50)->nullable();
            $table->string('selling_unit_slug', 100)->nullable();
            $table->decimal('selling_total', 15, 5)->nullable();
            $table->decimal('selling_correction', 15, 5)->nullable();
            $table->decimal('lqd_qty', 15, 5)->nullable();
            $table->decimal('lqd_price', 15, 5)->nullable();
            $table->string('lqd_currency', 20)->nullable();
            $table->string('lqd_unit_category', 50)->nullable();
            $table->string('lqd_unit_slug', 100)->nullable();
            $table->decimal('lqd_total', 15, 5)->nullable();
            $table->decimal('buying_unit_price', 15, 5)->nullable();
            $table->string('buying_currency', 20)->nullable();
            $table->string('buying_unit_category', 50)->nullable();
            $table->string('buying_unit_slug', 100)->nullable();
            $table->decimal('buying_total', 15, 5)->nullable();
            $table->decimal('buying_correction', 15, 5)->nullable();
            $table->decimal('rebate_rate_packer', 15, 5)->nullable();
            $table->string('rebate_rate_packer_currency', 20)->nullable();
            $table->string('rebate_rate_packer_unit_category', 50)->nullable();
            $table->string('rebate_rate_packer_unit_slug', 100)->nullable();
            $table->decimal('rebate_rate_packer_total', 15, 5)->nullable();
            $table->decimal('rebate_rate_customer', 15, 5)->nullable();
            $table->string('rebate_rate_customer_currency', 20)->nullable();
            $table->string('rebate_rate_customer_unit_category', 50)->nullable();
            $table->string('rebate_rate_customer_unit_slug', 100)->nullable();
            $table->decimal('rebate_rate_customer_total', 15, 5)->nullable();
            $table->decimal('total_ctn_correction', 15, 5)->nullable();
            $table->decimal('total_nw_correction', 15, 5)->nullable();
            $table->decimal('commission_from_packer', 15, 5)->nullable();
            $table->string('commission_from_packer_unit_category', 50)->nullable();
            $table->string('commission_from_packer_unit_slug', 100)->nullable();
            $table->decimal('total_packer_commission', 15, 5)->nullable();
            $table->decimal('commission_from_customer', 15, 5)->nullable();
            $table->string('commission_from_customer_unit_category', 50)->nullable();
            $table->string('commission_from_customer_unit_slug', 100)->nullable();
            $table->decimal('total_customer_commission', 15, 5)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['transaction_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_items');
    }
};
