<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, update existing data to map to new values
        if (Schema::hasColumn('equipment_items', 'condition')) {
            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE `equipment_items` MODIFY `condition` ENUM('available', 'damaged', 'missing', 'under_repair', 'New', 'Good', 'Fair', 'Poor', 'Damaged', 'Missing', 'Under Repair') DEFAULT 'Good'");
            }

            // Map old values to new values
            DB::table('equipment_items')
                ->where('condition', 'available')
                ->update(['condition' => 'Good']);

            DB::table('equipment_items')
                ->where('condition', 'damaged')
                ->update(['condition' => 'Damaged']);

            DB::table('equipment_items')
                ->where('condition', 'missing')
                ->update(['condition' => 'Missing']);

            DB::table('equipment_items')
                ->where('condition', 'under_repair')
                ->update(['condition' => 'Under Repair']);

            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE `equipment_items` MODIFY `condition` ENUM('New', 'Good', 'Fair', 'Poor', 'Damaged', 'Missing', 'Under Repair') DEFAULT 'Good'");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to old enum values and map data back
        if (Schema::hasColumn('equipment_items', 'condition')) {
            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE `equipment_items` MODIFY `condition` ENUM('available', 'damaged', 'missing', 'under_repair', 'New', 'Good', 'Fair', 'Poor', 'Damaged', 'Missing', 'Under Repair') DEFAULT 'available'");
            }

            // Map new values back to old values
            DB::table('equipment_items')
                ->where('condition', 'Good')
                ->orWhere('condition', 'New')
                ->orWhere('condition', 'Fair')
                ->orWhere('condition', 'Poor')
                ->update(['condition' => 'available']);

            DB::table('equipment_items')
                ->where('condition', 'Damaged')
                ->update(['condition' => 'damaged']);

            DB::table('equipment_items')
                ->where('condition', 'Missing')
                ->update(['condition' => 'missing']);

            DB::table('equipment_items')
                ->where('condition', 'Under Repair')
                ->update(['condition' => 'under_repair']);

            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE `equipment_items` MODIFY `condition` ENUM('available', 'damaged', 'missing', 'under_repair') DEFAULT 'available'");
            }
        }
    }
};
