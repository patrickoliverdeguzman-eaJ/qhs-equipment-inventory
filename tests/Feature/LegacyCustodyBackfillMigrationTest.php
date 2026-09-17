<?php

namespace Tests\Feature;

use App\Models\Equipment;
use App\Models\EquipmentItem;
use App\Models\Laboratory;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LegacyCustodyBackfillMigrationTest extends TestCase
{
    use DatabaseMigrations;

    public function test_existing_borrowed_and_returned_records_are_backfilled_without_inventing_conditions(): void
    {
        // Recreate the pre-custody schema. The maintenance migration is newer and
        // must be rolled back first because it depends on the custody columns.
        $this->artisan('migrate:rollback', ['--step' => 2, '--force' => true])->assertExitCode(0);

        $borrower = User::factory()->create();
        $laboratory = Laboratory::create([
            'name' => 'Legacy laboratory',
            'location' => 'Old building',
            'description' => 'Migration fixture',
            'isActive' => true,
        ]);
        $equipment = Equipment::create([
            'name' => 'Legacy equipment',
            'laboratory_id' => $laboratory->id,
            'description' => 'Migration fixture',
            'isActive' => true,
        ]);
        $borrowedItem = EquipmentItem::create(['equipment_id' => $equipment->id, 'condition' => 'Fair', 'isBorrowed' => true]);
        $returnedItem = EquipmentItem::create(['equipment_id' => $equipment->id, 'condition' => 'Good', 'isBorrowed' => false]);
        $approvedAt = now()->subDays(5);
        $returnedAt = now()->subDay();

        $borrowed = Transaction::create([
            'borrower_id' => $borrower->id,
            'borrower_name' => $borrower->name,
            'laboratory_id' => $laboratory->id,
            'borrow_date' => now()->subDays(5),
            'return_date' => now()->addDay(),
            'status' => 'borrowed',
            'accepted_at' => $approvedAt,
            'accepted_by_name' => 'Legacy custodian',
        ]);
        $returned = Transaction::create([
            'borrower_id' => $borrower->id,
            'borrower_name' => $borrower->name,
            'laboratory_id' => $laboratory->id,
            'borrow_date' => now()->subDays(8),
            'return_date' => now()->subDays(2),
            'status' => 'returned',
            'accepted_at' => now()->subDays(8),
            'returned_at' => $returnedAt,
            'accepted_by_name' => 'Legacy custodian',
            'returned_by_name' => 'Legacy receiver',
        ]);
        $borrowed->assignedItems()->attach($borrowedItem);
        $returned->assignedItems()->attach($returnedItem);

        $this->artisan('migrate', [
            '--path' => 'database/migrations/2026_09_15_000000_add_custody_workflow_to_transactions.php',
            '--force' => true,
        ])->assertExitCode(0);

        $borrowedPivot = DB::table('transaction_equipment_items')->where('transaction_id', $borrowed->id)->first();
        $returnedPivot = DB::table('transaction_equipment_items')->where('transaction_id', $returned->id)->first();

        $this->assertNotNull(Transaction::findOrFail($borrowed->id)->issued_at);
        $this->assertNotNull($borrowedPivot->issued_at);
        $this->assertNull($borrowedPivot->condition_at_issue);
        $this->assertNull($borrowedPivot->returned_at);
        $this->assertNotNull($returnedPivot->issued_at);
        $this->assertNotNull($returnedPivot->returned_at);
        $this->assertSame('Legacy receiver', $returnedPivot->returned_by_name);
        $this->assertNull($returnedPivot->condition_at_issue);
        $this->assertNull($returnedPivot->condition_at_return);
    }
}
