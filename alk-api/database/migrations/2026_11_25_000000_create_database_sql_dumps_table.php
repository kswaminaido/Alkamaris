<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('database_sql_dumps', function (Blueprint $table) {
            $table->id();
            $table->string('database_name');
            $table->date('backup_date')->index();
            $table->string('status', 20)->index();
            $table->unsignedInteger('table_count')->default(0);
            $table->unsignedBigInteger('row_count')->default(0);
            $table->longText('sql_dump')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('database_sql_dumps');
    }
};
