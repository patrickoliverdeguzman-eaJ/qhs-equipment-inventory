<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Indexes already created by earlier migrations are intentionally omitted here.
        Schema::table('equipment_items', function (Blueprint $table) {
            if (! Schema::hasIndex('equipment_items', 'equipment_items_condition_index')) {
                $table->index('condition');
            }
            if (! Schema::hasIndex('equipment_items', 'equipment_items_created_at_index')) {
                $table->index('created_at');
            }
        });

        Schema::table('equipment', function (Blueprint $table) {
            if (! Schema::hasIndex('equipment', 'equipment_laboratory_id_index')) {
                $table->index('laboratory_id');
            }
            if (! Schema::hasIndex('equipment', 'equipment_isactive_index')) {
                $table->index('isActive');
            }
            if (! Schema::hasIndex('equipment', 'equipment_created_at_index')) {
                $table->index('created_at');
            }
        });

        Schema::table('transactions', function (Blueprint $table) {
            if (! Schema::hasIndex('transactions', 'transactions_created_at_index')) {
                $table->index('created_at');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasIndex('users', 'users_created_at_index')) {
                $table->index('created_at');
            }
            if (! Schema::hasIndex('users', 'users_isactive_index')) {
                $table->index('isActive');
            }
            if (! Schema::hasIndex('users', 'users_role_index')) {
                $table->index('role');
            }
        });
    }

    public function down(): void
    {
        $this->dropIndexIfExists('equipment_items', 'equipment_items_condition_index');
        $this->dropIndexIfExists('equipment_items', 'equipment_items_created_at_index');
        $this->dropIndexIfExists('equipment', 'equipment_laboratory_id_index');
        $this->dropIndexIfExists('equipment', 'equipment_isactive_index');
        $this->dropIndexIfExists('equipment', 'equipment_created_at_index');
        $this->dropIndexIfExists('transactions', 'transactions_created_at_index');
        $this->dropIndexIfExists('users', 'users_created_at_index');
        $this->dropIndexIfExists('users', 'users_isactive_index');
        $this->dropIndexIfExists('users', 'users_role_index');
    }

    private function dropIndexIfExists(string $tableName, string $indexName): void
    {
        if (! Schema::hasIndex($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexName) {
            $table->dropIndex($indexName);
        });
    }
};
