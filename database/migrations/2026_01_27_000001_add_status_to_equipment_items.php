<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Legacy duplicate: the original equipment_items migration owns condition.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Legacy duplicate migration. The preceding migration owns this column.
    }
};
