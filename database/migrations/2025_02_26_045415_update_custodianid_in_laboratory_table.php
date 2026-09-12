<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        if (! Schema::hasIndex('laboratories', 'laboratories_custodianid_unique')) {
            Schema::table('laboratories', function (Blueprint $table) {
                $table->unique('custodianID');
            });
        }
    }

    public function down()
    {
        // The unique constraint is owned by the original column migration.
    }
};
