<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('transactions', 'borrower_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->foreignId('borrower_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            });
        }

        DB::table('transactions')
            ->whereNull('borrower_id')
            ->orderBy('id')
            ->eachById(function ($transaction) {
                $borrowerId = DB::table('users')->where('email', $transaction->borrower_email)->value('id');

                if ($borrowerId) {
                    DB::table('transactions')->where('id', $transaction->id)->update(['borrower_id' => $borrowerId]);
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasColumn('transactions', 'borrower_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropConstrainedForeignId('borrower_id');
            });
        }
    }
};
