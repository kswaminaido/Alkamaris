<?php

use App\Enums\UserRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('phone_number')->nullable()->after('name');
            $table->text('address')->nullable()->after('email');
            $table->string('registration_number')->nullable()->unique()->after('address');
            $table->string('role')
                ->default(UserRole::Customer->value)
                ->after('registration_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['registration_number']);
            $table->dropColumn([
                'phone_number',
                'address',
                'registration_number',
                'role',
            ]);
        });
    }
};
