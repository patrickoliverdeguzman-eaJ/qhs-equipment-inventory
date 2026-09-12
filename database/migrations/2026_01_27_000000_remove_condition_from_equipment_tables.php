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
        // Drop condition column from equipment table
        if (Schema::hasColumn('equipment', 'condition')) {
            Schema::table('equipment', function (Blueprint $table) {
                $table->dropColumn('condition');
            });
        }

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore condition column to equipment table
        Schema::table('equipment', function (Blueprint $table) {
            $table->string('condition')->nullable();
        });

    }
};
