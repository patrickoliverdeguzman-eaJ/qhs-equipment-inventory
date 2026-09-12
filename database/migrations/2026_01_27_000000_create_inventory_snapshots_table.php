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
        Schema::create('inventory_snapshots', function (Blueprint $table) {
            $table->id();
            $table->date('snapshot_date');
            $table->foreignId('equipment_id')->constrained('equipment')->onDelete('cascade');
            $table->foreignId('laboratory_id')->constrained('laboratories')->onDelete('cascade');
            $table->integer('total_items')->default(0);
            $table->integer('borrowed_count')->default(0);
            $table->integer('available_count')->default(0);
            $table->timestamps();

            // Index for fast queries
            $table->index('snapshot_date');
            $table->index('equipment_id');
            $table->index('laboratory_id');

            // Unique constraint to prevent duplicate snapshots for same date/equipment/lab
            $table->unique(['snapshot_date', 'equipment_id', 'laboratory_id'], 'inv_snap_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_snapshots');
    }
};
