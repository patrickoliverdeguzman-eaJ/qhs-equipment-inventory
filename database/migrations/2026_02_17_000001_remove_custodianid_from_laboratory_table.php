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
        if (Schema::hasColumn('laboratories', 'custodianID')) {
            DB::table('laboratories')
                ->whereNotNull('custodianID')
                ->orderBy('id')
                ->eachById(function ($laboratory) {
                    DB::table('custodian_laboratory')->updateOrInsert(
                        ['user_id' => $laboratory->custodianID, 'laboratory_id' => $laboratory->id],
                        ['created_at' => now(), 'updated_at' => now()],
                    );
                });

            Schema::table('laboratories', function (Blueprint $table) {
                $table->dropUnique(['custodianID']);
                $table->dropColumn('custodianID');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('laboratories', function (Blueprint $table) {
            $table->unsignedBigInteger('custodianID')->nullable()->unique();
        });
    }
};
