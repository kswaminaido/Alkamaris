<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table): void {
            $table->string('by_qc')->nullable()->after('sales_person_id');
        });

        if (! DB::table('configs')->where('type', 'transaction_by_qc')->exists()) {
            DB::table('configs')->insert([
                'type' => 'transaction_by_qc',
                'data' => json_encode([], JSON_THROW_ON_ERROR),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('configs')->where('type', 'transaction_by_qc')->delete();

        Schema::table('transactions', function (Blueprint $table): void {
            $table->dropColumn('by_qc');
        });
    }
};
