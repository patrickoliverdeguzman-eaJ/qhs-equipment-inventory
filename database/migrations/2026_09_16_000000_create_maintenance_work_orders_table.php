<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_work_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_item_id')->constrained()->restrictOnDelete();
            $table->foreignId('laboratory_id')->constrained()->restrictOnDelete();
            $table->foreignId('source_transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->string('type', 40);
            $table->string('status', 32)->default('open');
            $table->string('priority', 16)->default('normal');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('condition_before', 50)->nullable();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('assigned_to_name')->nullable();
            $table->foreignId('reported_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reported_by_name')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('service_provider')->nullable();
            $table->decimal('estimated_cost', 12, 2)->nullable();
            $table->decimal('actual_cost', 12, 2)->nullable();
            $table->text('completion_notes')->nullable();
            $table->string('result_condition', 50)->nullable();
            $table->unsignedSmallInteger('recurrence_interval_days')->nullable();
            $table->timestamp('next_due_at')->nullable();
            $table->timestamps();

            $table->index(['laboratory_id', 'status', 'due_at'], 'maintenance_lab_status_due_index');
            $table->index(['equipment_item_id', 'status'], 'maintenance_item_status_index');
            $table->index(['assigned_to_id', 'status'], 'maintenance_assignee_status_index');
            $table->index(['next_due_at', 'status'], 'maintenance_next_due_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_work_orders');
    }
};
