<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE transactions MODIFY status ENUM('I', 'P', 'D', 'S', 'R', 'U', 'T') NOT NULL DEFAULT 'U'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::table('transactions')
            ->where('status', 'D')
            ->update(['status' => 'P']);

        DB::statement("ALTER TABLE transactions MODIFY status ENUM('I', 'P', 'S', 'R', 'U', 'T') NOT NULL DEFAULT 'U'");
    }
};
