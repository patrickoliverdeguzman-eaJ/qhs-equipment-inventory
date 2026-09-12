<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('equipment', 'isActive')) {
            Schema::table('equipment', function (Blueprint $table) {
                $table->boolean('isActive')->default(true)->after('image');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('equipment', 'isActive')) {
            Schema::table('equipment', fn (Blueprint $table) => $table->dropColumn('isActive'));
        }
    }
};
