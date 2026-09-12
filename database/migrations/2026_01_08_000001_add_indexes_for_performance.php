<?php

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
        Schema::table('equipment_items', function (Blueprint $table) {
            $table->index('equipment_id');
            $table->index('unit_id');
            $table->index('isBorrowed');
        });

        Schema::table('transaction_equipment_items', function (Blueprint $table) {
            $table->index('transaction_id');
            $table->index('equipment_item_id');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->index('laboratory_id');
            $table->index('borrower_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment_items', function (Blueprint $table) {
            $table->dropIndex(['equipment_id']);
            $table->dropIndex(['unit_id']);
            $table->dropIndex(['isBorrowed']);
        });

        Schema::table('transaction_equipment_items', function (Blueprint $table) {
            $table->dropIndex(['transaction_id']);
            $table->dropIndex(['equipment_item_id']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['laboratory_id']);
            $table->dropIndex(['borrower_id']);
            $table->dropIndex(['status']);
        });
    }
};
