<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('general_info_customer', function (Blueprint $table): void {
            $table->string('prices_customer_rate')->nullable()->change();
        });

        Schema::table('general_info_packer', function (Blueprint $table): void {
            $table->string('prices_packer_rate')->nullable()->change();
        });

        if (Schema::hasTable('configs')) {
            DB::table('configs')
                ->where('type', 'customer_price_type')
                ->update([
                    'data' => json_encode(['EXW (Ex Works)', 'FCA', 'CIF', 'CFR', 'FOB', 'DAP', 'DDP', 'DPU'], JSON_THROW_ON_ERROR),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('general_info_customer', function (Blueprint $table): void {
            $table->decimal('prices_customer_rate', 14, 4)->nullable()->change();
        });

        Schema::table('general_info_packer', function (Blueprint $table): void {
            $table->decimal('prices_packer_rate', 14, 4)->nullable()->change();
        });
    }
};
