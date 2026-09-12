<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->timestamp('accepted_at')->nullable()->after('status');
            $table->timestamp('returned_at')->nullable()->after('accepted_at');
            $table->timestamp('rejected_at')->nullable()->after('returned_at');
        });

        // Backfill accepted_at with updated_at for borrowed, returned, and rejected transactions
        DB::table('transactions')
            ->whereIn('status', ['borrowed', 'returned', 'rejected'])
            ->whereNull('accepted_at')
            ->update([
                'accepted_at' => DB::raw('updated_at'),
            ]);

        // Backfill returned_at with updated_at for returned transactions
        DB::table('transactions')
            ->where('status', 'returned')
            ->whereNull('returned_at')
            ->update([
                'returned_at' => DB::raw('updated_at'),
            ]);

        // Backfill rejected_at with updated_at for rejected transactions
        DB::table('transactions')
            ->where('status', 'rejected')
            ->whereNull('rejected_at')
            ->update([
                'rejected_at' => DB::raw('updated_at'),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['accepted_at', 'returned_at', 'rejected_at']);
        });
    }
};
