<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaction_logistics', function (Blueprint $table): void {
            $table->date('packaging_date_approved')->nullable()->after('packaging_date_outer');
            $table->string('temperature_recorder_location_row_no')->nullable()->after('temperature_recorder_no');
            $table->string('discharge')->nullable()->after('qc_inspection_date');
            $table->string('at')->nullable()->after('discharge');
            $table->string('sc_inv_to_customer')->nullable()->after('shipping_line_agent');
        });
    }

    public function down(): void
    {
        Schema::table('transaction_logistics', function (Blueprint $table): void {
            $table->dropColumn([
                'packaging_date_approved',
                'temperature_recorder_location_row_no',
                'discharge',
                'at',
                'sc_inv_to_customer',
            ]);
        });
    }
};
