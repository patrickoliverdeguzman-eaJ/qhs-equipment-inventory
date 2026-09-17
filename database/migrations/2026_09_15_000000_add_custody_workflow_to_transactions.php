<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->makeStatusExtensible();

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('accepted_by_id')->nullable()->after('accepted_at')->constrained('users')->nullOnDelete();
            $table->timestamp('issued_at')->nullable()->after('accepted_by_id');
            $table->foreignId('issued_by_id')->nullable()->after('issued_at')->constrained('users')->nullOnDelete();
            $table->string('issued_by_name')->nullable()->after('issued_by_id');
            $table->text('issue_notes')->nullable()->after('issued_by_name');
            $table->foreignId('returned_by_id')->nullable()->after('returned_at')->constrained('users')->nullOnDelete();
            $table->foreignId('rejected_by_id')->nullable()->after('rejected_at')->constrained('users')->nullOnDelete();
            $table->index(['status', 'return_date'], 'transactions_status_due_index');
        });

        Schema::table('transaction_equipment_items', function (Blueprint $table) {
            $table->timestamp('issued_at')->nullable()->after('equipment_item_id');
            $table->string('condition_at_issue', 50)->nullable()->after('issued_at');
            $table->timestamp('returned_at')->nullable()->after('condition_at_issue');
            $table->string('condition_at_return', 50)->nullable()->after('returned_at');
            $table->text('return_notes')->nullable()->after('condition_at_return');
            $table->foreignId('returned_by_id')->nullable()->after('return_notes')->constrained('users')->nullOnDelete();
            $table->string('returned_by_name')->nullable()->after('returned_by_id');
            $table->index(['transaction_id', 'issued_at', 'returned_at'], 'transaction_items_outstanding_index');
        });

        DB::table('transactions')
            ->whereIn('status', ['borrowed', 'returned'])
            ->orderBy('id')
            ->chunkById(100, function ($transactions): void {
                foreach ($transactions as $transaction) {
                    $issuedAt = $transaction->accepted_at ?? $transaction->updated_at ?? $transaction->created_at;

                    DB::table('transactions')->where('id', $transaction->id)->update([
                        'issued_at' => $issuedAt,
                        'issued_by_name' => $transaction->accepted_by_name,
                    ]);

                    DB::table('transaction_equipment_items')
                        ->where('transaction_id', $transaction->id)
                        ->whereNull('issued_at')
                        ->update(['issued_at' => $issuedAt]);

                    if ($transaction->status === 'returned') {
                        $returnedAt = $transaction->returned_at ?? $transaction->updated_at ?? $issuedAt;

                        DB::table('transaction_equipment_items')
                            ->where('transaction_id', $transaction->id)
                            ->whereNull('returned_at')
                            ->update([
                                'returned_at' => $returnedAt,
                                'returned_by_name' => $transaction->returned_by_name,
                            ]);
                    }
                }
            });
    }

    public function down(): void
    {
        DB::table('transactions')->where('status', 'approved')->update(['status' => 'pending']);

        Schema::table('transaction_equipment_items', function (Blueprint $table) {
            $table->dropIndex('transaction_items_outstanding_index');
            $table->dropConstrainedForeignId('returned_by_id');
            $table->dropColumn([
                'issued_at',
                'condition_at_issue',
                'returned_at',
                'condition_at_return',
                'return_notes',
                'returned_by_name',
            ]);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_status_due_index');
            $table->dropConstrainedForeignId('accepted_by_id');
            $table->dropConstrainedForeignId('issued_by_id');
            $table->dropConstrainedForeignId('returned_by_id');
            $table->dropConstrainedForeignId('rejected_by_id');
            $table->dropColumn(['issued_at', 'issued_by_name', 'issue_notes']);
        });

        $this->restoreStatusEnum();
    }

    private function makeStatusExtensible(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE transactions MODIFY status VARCHAR(32) NOT NULL DEFAULT 'pending'");

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check');
            DB::statement("ALTER TABLE transactions ALTER COLUMN status TYPE VARCHAR(32), ALTER COLUMN status SET DEFAULT 'pending'");

            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->string('status', 32)->default('pending')->change();
        });
    }

    private function restoreStatusEnum(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE transactions MODIFY status ENUM('pending','borrowed','returned','rejected') NOT NULL DEFAULT 'pending'");

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('pending','borrowed','returned','rejected'))");

            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->enum('status', ['pending', 'borrowed', 'returned', 'rejected'])->default('pending')->change();
        });
    }
};
