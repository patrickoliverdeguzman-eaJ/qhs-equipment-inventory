<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('transaction_equipment_items')) {
            return;
        }

        Schema::create('transaction_equipment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_item_id')->constrained()->restrictOnDelete();
            $table->timestamps();
            $table->unique(['transaction_id', 'equipment_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_equipment_items');
    }
};
