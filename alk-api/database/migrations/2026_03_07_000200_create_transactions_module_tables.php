<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table): void {
            $table->id();
            $table->string('booking_no')->unique();
            $table->string('booking_mode', 30)->default('trade_commission');
            $table->date('issue_date')->nullable();
            $table->foreignId('sales_person_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('product_origin')->nullable();
            $table->string('destination')->nullable();
            $table->string('category')->nullable();
            $table->string('type')->nullable();
            $table->string('country')->nullable();
            $table->string('container_primary')->nullable();
            $table->string('container_secondary')->nullable();
            $table->boolean('certified')->default(false);
            $table->decimal('net_margin', 14, 2)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['I', 'P', 'S', 'R', 'U', 'T'])->default('U');
            $table->date('lc_set_at')->nullable();
            $table->integer('lc_days')->default(0);
            $table->timestamps();
        });

        Schema::create('general_info_customer', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->string('customer')->nullable();
            $table->string('attention')->nullable();
            $table->string('ship_to')->nullable();
            $table->string('buyer')->nullable();
            $table->string('buyer_number')->nullable();
            $table->string('end_customer')->nullable();
            $table->string('prices_customer_type')->nullable();
            $table->decimal('prices_customer_rate', 14, 4)->nullable();
            $table->string('payment_customer_term')->nullable();
            $table->string('payment_customer_type')->nullable();
            $table->decimal('payment_customer_advance_percent', 8, 2)->nullable();
            $table->text('description')->nullable();
            $table->string('tolerance')->nullable();
            $table->boolean('marketing_fee')->default(false);
            $table->timestamps();
        });

        Schema::create('general_info_packer', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->string('vendor')->nullable();
            $table->string('packer_name')->nullable();
            $table->string('packer_number')->nullable();
            $table->string('packed_by')->nullable();
            $table->string('prices_packer_type')->nullable();
            $table->decimal('prices_packer_rate', 14, 4)->nullable();
            $table->string('payment_packer_term')->nullable();
            $table->string('payment_packer_type')->nullable();
            $table->decimal('payment_packer_advance_percent', 8, 2)->nullable();
            $table->text('description')->nullable();
            $table->string('tolerance')->nullable();
            $table->decimal('total_lqd_price', 14, 2)->nullable();
            $table->string('consignee')->nullable();
            $table->timestamps();
        });

        Schema::create('revenue_customer', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->decimal('total_selling_value', 14, 2)->nullable();
            $table->string('total_selling_currency')->nullable();
            $table->boolean('commission_enabled')->default(false);
            $table->decimal('commission_percent', 8, 2)->nullable();
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('amount_currency')->nullable();
            $table->text('description')->nullable();
            $table->decimal('rebate_memo_amount', 14, 2)->nullable();
            $table->string('rebate_memo_description')->nullable();
            $table->decimal('overcharge_sc_amount', 14, 2)->nullable();
            $table->string('overcharge_sc_description')->nullable();
            $table->timestamps();
        });

        Schema::create('revenue_packer', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->decimal('total_buying_value', 14, 2)->nullable();
            $table->string('total_buying_currency')->nullable();
            $table->boolean('commission_enabled')->default(false);
            $table->decimal('commission_percent', 8, 2)->nullable();
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('amount_currency')->nullable();
            $table->text('description')->nullable();
            $table->decimal('overcharge_sc_amount', 14, 2)->nullable();
            $table->string('overcharge_sc_description')->nullable();
            $table->timestamps();
        });

        Schema::create('cash_flow_customer', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->date('date_advance')->nullable();
            $table->decimal('amount_advance', 14, 2)->nullable();
            $table->date('date_balance')->nullable();
            $table->decimal('amount_balance', 14, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('cash_flow_packer', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->date('date_advance')->nullable();
            $table->decimal('amount_advance', 14, 2)->nullable();
            $table->date('date_balance')->nullable();
            $table->decimal('amount_balance', 14, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('shipping_details_customer', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->date('lsd_min')->nullable();
            $table->date('lsd_max')->nullable();
            $table->integer('presentation_days')->nullable();
            $table->date('lc_expiry')->nullable();
            $table->date('req_eta')->nullable();
            $table->timestamps();
        });

        Schema::create('shipping_details_packer', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->date('lsd_min')->nullable();
            $table->date('lsd_max')->nullable();
            $table->integer('presentation_days')->nullable();
            $table->date('lc_expiry')->nullable();
            $table->date('req_eta')->nullable();
            $table->timestamps();
        });

        Schema::create('transaction_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->text('by_sales')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_notes');
        Schema::dropIfExists('shipping_details_packer');
        Schema::dropIfExists('shipping_details_customer');
        Schema::dropIfExists('cash_flow_packer');
        Schema::dropIfExists('cash_flow_customer');
        Schema::dropIfExists('revenue_packer');
        Schema::dropIfExists('revenue_customer');
        Schema::dropIfExists('general_info_packer');
        Schema::dropIfExists('general_info_customer');
        Schema::dropIfExists('transactions');
    }
};
