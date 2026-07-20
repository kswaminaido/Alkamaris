<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_flow_packer', function (Blueprint $table): void {
            $table->string('invoice_number')->nullable()->after('invoice_date');
        });
    }

    public function down(): void
    {
        Schema::table('cash_flow_packer', function (Blueprint $table): void {
            $table->dropColumn('invoice_number');
        });
    }
};
