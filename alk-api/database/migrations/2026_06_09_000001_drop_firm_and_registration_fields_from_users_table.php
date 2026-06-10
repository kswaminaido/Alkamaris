<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'registration_number')) {
            Schema::table('users', function (Blueprint $table): void {
                try {
                    $table->dropUnique(['registration_number']);
                } catch (Throwable) {
                    // Some environments may already have the column without the old unique index.
                }

                $table->dropColumn('registration_number');
            });
        }

        if (Schema::hasColumn('users', 'firm_name')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('firm_name');
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'registration_number')) {
                $table->string('registration_number')->nullable()->unique()->after('address');
            }

            if (! Schema::hasColumn('users', 'firm_name')) {
                $table->string('firm_name')->nullable()->after('contact_name');
            }
        });
    }
};
