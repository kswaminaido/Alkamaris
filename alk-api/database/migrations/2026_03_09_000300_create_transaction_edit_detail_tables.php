<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_logistics', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->unique()->constrained('transactions')->cascadeOnDelete();
            $table->date('plan_etd')->nullable();
            $table->date('plan_eta')->nullable();
            $table->date('packaging_date_inner')->nullable();
            $table->date('packaging_date_outer')->nullable();
            $table->string('feeder_vessel')->nullable();
            $table->string('mother_vessel')->nullable();
            $table->string('container_no')->nullable();
            $table->string('seal_no')->nullable();
            $table->string('lc_no')->nullable();
            $table->string('temperature_recorder_no')->nullable();
            $table->date('etd_date')->nullable();
            $table->date('eta_date')->nullable();
            $table->date('qc_inspection_date')->nullable();
            $table->string('discharge_at')->nullable();
            $table->string('service_type')->nullable();
            $table->date('bl_date')->nullable();
            $table->string('bl_no')->nullable();
            $table->string('port')->nullable();
            $table->string('destination')->nullable();
            $table->string('shipping_line_agent')->nullable();
            $table->date('packer_inv_date')->nullable();
            $table->string('packer_inv')->nullable();
            $table->boolean('cancel_claim')->default(false);
            $table->boolean('cancel_reject')->default(false);
            $table->boolean('cancel_move')->default(false);
            $table->timestamps();
        });

        Schema::create('transaction_expense_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->string('section', 50);
            $table->string('group_name', 100)->nullable();
            $table->string('line_key', 100);
            $table->string('line_label', 120)->nullable();
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('currency', 50)->nullable();
            $table->string('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['transaction_id', 'section']);
        });

        Schema::create('transaction_note_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->string('section', 50)->nullable();
            $table->string('note_key', 100);
            $table->text('note_value')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['transaction_id', 'section']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_note_entries');
        Schema::dropIfExists('transaction_expense_lines');
        Schema::dropIfExists('transaction_logistics');
    }
};
