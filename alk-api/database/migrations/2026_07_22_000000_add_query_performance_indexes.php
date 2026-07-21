<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table): void {
            $table->index(['created_at', 'id'], 'transactions_created_id_idx');
            $table->index(['status', 'created_at', 'id'], 'transactions_status_created_id_idx');
            $table->index(['status', 'updated_at', 'id'], 'transactions_status_updated_id_idx');
            $table->index(['sales_person_id', 'created_at', 'id'], 'transactions_sales_created_id_idx');
            $table->index(['status', 'lc_set_at'], 'transactions_status_lc_set_idx');
        });

        Schema::table('general_info_customer', function (Blueprint $table): void {
            $table->index('customer', 'general_info_customer_customer_idx');
        });

        Schema::table('general_info_packer', function (Blueprint $table): void {
            $table->index('vendor', 'general_info_packer_vendor_idx');
            $table->index('packer_name', 'general_info_packer_packer_name_idx');
        });

        Schema::table('shipping_details_customer', function (Blueprint $table): void {
            $table->index(['lsd_min', 'transaction_id'], 'shipping_details_customer_lsd_transaction_idx');
        });

        Schema::table('shipping_details_packer', function (Blueprint $table): void {
            $table->index(['lsd_min', 'transaction_id'], 'shipping_details_packer_lsd_transaction_idx');
        });

        Schema::table('transaction_logistics', function (Blueprint $table): void {
            $table->index(['qc_inspection_date', 'transaction_id'], 'transaction_logistics_qc_transaction_idx');
        });

        Schema::table('transaction_items', function (Blueprint $table): void {
            $table->index('product', 'transaction_items_product_idx');
            $table->index('style', 'transaction_items_style_idx');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->index(['role', 'is_active', 'id'], 'users_role_active_id_idx');
            $table->index(['role', 'name'], 'users_role_name_idx');
            $table->index(['created_at', 'id'], 'users_created_id_idx');
        });

        Schema::table('users_event_log', function (Blueprint $table): void {
            $table->index(['created_at', 'id'], 'users_event_log_created_id_idx');
            $table->index(['event_type', 'created_at', 'id'], 'users_event_log_event_created_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('users_event_log', function (Blueprint $table): void {
            $table->dropIndex('users_event_log_event_created_id_idx');
            $table->dropIndex('users_event_log_created_id_idx');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex('users_created_id_idx');
            $table->dropIndex('users_role_name_idx');
            $table->dropIndex('users_role_active_id_idx');
        });

        Schema::table('transaction_items', function (Blueprint $table): void {
            $table->dropIndex('transaction_items_style_idx');
            $table->dropIndex('transaction_items_product_idx');
        });

        Schema::table('transaction_logistics', function (Blueprint $table): void {
            $table->dropIndex('transaction_logistics_qc_transaction_idx');
        });

        Schema::table('shipping_details_packer', function (Blueprint $table): void {
            $table->dropIndex('shipping_details_packer_lsd_transaction_idx');
        });

        Schema::table('shipping_details_customer', function (Blueprint $table): void {
            $table->dropIndex('shipping_details_customer_lsd_transaction_idx');
        });

        Schema::table('general_info_packer', function (Blueprint $table): void {
            $table->dropIndex('general_info_packer_packer_name_idx');
            $table->dropIndex('general_info_packer_vendor_idx');
        });

        Schema::table('general_info_customer', function (Blueprint $table): void {
            $table->dropIndex('general_info_customer_customer_idx');
        });

        Schema::table('transactions', function (Blueprint $table): void {
            $table->dropIndex('transactions_status_lc_set_idx');
            $table->dropIndex('transactions_sales_created_id_idx');
            $table->dropIndex('transactions_status_updated_id_idx');
            $table->dropIndex('transactions_status_created_id_idx');
            $table->dropIndex('transactions_created_id_idx');
        });
    }
};
