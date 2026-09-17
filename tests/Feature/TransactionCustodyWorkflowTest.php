<?php

namespace Tests\Feature;

use App\Events\TransactionUpdated;
use App\Models\ActionLog;
use App\Models\Equipment;
use App\Models\EquipmentItem;
use App\Models\Laboratory;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransactionCustodyWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_is_approved_before_exact_assigned_units_are_issued(): void
    {
        [$transaction, $items, $admin] = $this->pendingTransaction(2);
        Event::fake([TransactionUpdated::class]);
        Sanctum::actingAs($admin, ['app:use']);

        $dueDate = today()->addDays(5)->toDateString();
        $this->postJson("/api/transactions/{$transaction->id}/accept", ['return_date' => $dueDate])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.lifecycle_stage', 'approved')
            ->assertJsonPath('data.approved_by_name', $admin->name)
            ->assertJsonPath('data.outstanding_count', 0);

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'status' => 'approved',
            'accepted_by_id' => $admin->id,
        ]);
        $this->assertTrue($items[0]->fresh()->isBorrowed);

        $this->postJson("/api/transactions/{$transaction->id}/issue", [
            'unit_ids' => [$items[0]->unit_id],
        ])->assertUnprocessable();

        $this->postJson("/api/transactions/{$transaction->id}/issue", [
            'unit_ids' => ['UNKNOWN-UNIT', $items[1]->unit_id],
        ])->assertUnprocessable();

        $qrUrl = "https://inventory.test/item-history/{$items[0]->unit_id}";
        $this->postJson("/api/transactions/{$transaction->id}/issue", [
            'unit_ids' => [$qrUrl, $items[0]->unit_id],
        ])->assertUnprocessable();

        $this->postJson("/api/transactions/{$transaction->id}/issue", [
            'unit_ids' => [$qrUrl, $items[1]->unit_id],
            'notes' => 'Verified at the service desk.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'borrowed')
            ->assertJsonPath('data.issued_count', 2)
            ->assertJsonPath('data.outstanding_count', 2)
            ->assertJsonPath('data.issue_notes', 'Verified at the service desk.');

        foreach ($items as $item) {
            $this->assertDatabaseHas('transaction_equipment_items', [
                'transaction_id' => $transaction->id,
                'equipment_item_id' => $item->id,
                'condition_at_issue' => $item->condition,
            ]);
        }

        Event::assertDispatched(TransactionUpdated::class, 2);
        $this->assertDatabaseHas('action_logs', ['action' => 'transaction_approved']);
        $this->assertDatabaseHas('action_logs', ['action' => 'transaction_issued']);
    }

    public function test_returns_are_partial_release_units_immediately_and_complete_only_after_final_unit(): void
    {
        [$transaction, $items, $admin] = $this->pendingTransaction(2);
        Sanctum::actingAs($admin, ['app:use']);
        $this->approveAndIssue($transaction, $items);

        $this->postJson("/api/transactions/{$transaction->id}/return-items", [
            'items' => [[
                'unit_id' => $items[0]->unit_id,
                'condition' => 'Good',
                'notes' => null,
            ]],
        ])->assertOk()
            ->assertJsonPath('data.status', 'borrowed')
            ->assertJsonPath('data.lifecycle_stage', 'partially_returned')
            ->assertJsonPath('data.returned_count', 1)
            ->assertJsonPath('data.outstanding_count', 1);

        $this->assertFalse($items[0]->fresh()->isBorrowed);
        $this->assertTrue($items[1]->fresh()->isBorrowed);

        $this->postJson("/api/transactions/{$transaction->id}/return-items", [
            'items' => [[
                'unit_id' => $items[0]->unit_id,
                'condition' => 'Good',
            ]],
        ])->assertUnprocessable();

        $this->postJson("/api/transactions/{$transaction->id}/return-items", [
            'items' => [[
                'unit_id' => $items[1]->unit_id,
                'condition' => 'Damaged',
            ]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items.0.notes');

        $this->postJson("/api/transactions/{$transaction->id}/return-items", [
            'items' => [[
                'unit_id' => $items[1]->unit_id,
                'condition' => 'Damaged',
                'notes' => 'Cracked eyepiece discovered at return.',
            ]],
        ])->assertOk()
            ->assertJsonPath('data.status', 'returned')
            ->assertJsonPath('data.returned_count', 2)
            ->assertJsonPath('data.outstanding_count', 0);

        $this->assertFalse($items[1]->fresh()->isBorrowed);
        $this->assertSame('Damaged', $items[1]->fresh()->condition);
        $this->assertDatabaseHas('transaction_equipment_items', [
            'equipment_item_id' => $items[1]->id,
            'condition_at_return' => 'Damaged',
            'returned_by_id' => $admin->id,
        ]);
        $this->assertSame(2, ActionLog::where('action', 'transaction_items_returned')->count());
        $this->assertDatabaseHas('action_logs', ['action' => 'transaction_damaged_return']);
        $this->assertDatabaseHas('action_logs', ['action' => 'transaction_returned']);
    }

    public function test_duplicate_unknown_unissued_and_cross_laboratory_processing_are_rejected(): void
    {
        [$transaction, $items, $admin, $laboratory] = $this->pendingTransaction(2);
        Sanctum::actingAs($admin, ['app:use']);
        $this->postJson("/api/transactions/{$transaction->id}/accept", [
            'return_date' => today()->addWeek()->toDateString(),
        ])->assertOk();

        $otherCustodian = User::factory()->create(['role' => 'custodian']);
        $otherLab = Laboratory::create([
            'name' => 'Other laboratory',
            'location' => 'Building B',
            'description' => 'Not assigned to this request',
            'isActive' => true,
        ]);
        $otherCustodian->laboratories()->attach($otherLab);
        Sanctum::actingAs($otherCustodian, ['app:use']);
        $this->postJson("/api/transactions/{$transaction->id}/issue", [
            'unit_ids' => $items->pluck('unit_id')->all(),
        ])->assertForbidden();

        $laboratoryCustodian = User::factory()->create(['role' => 'custodian']);
        $laboratoryCustodian->laboratories()->attach($laboratory);
        Sanctum::actingAs($laboratoryCustodian, ['app:use']);
        $this->postJson("/api/transactions/{$transaction->id}/return-items", [
            'items' => [['unit_id' => $items[0]->unit_id, 'condition' => 'Good']],
        ])->assertUnprocessable();
    }

    public function test_overdue_is_derived_only_for_issued_outstanding_units(): void
    {
        [$transaction, $items, $admin] = $this->pendingTransaction(1);
        Sanctum::actingAs($admin, ['app:use']);
        $this->approveAndIssue($transaction, $items, today()->toDateString());

        $this->travel(1)->days();
        $this->getJson("/api/transactions/{$transaction->id}")
            ->assertOk()
            ->assertJsonPath('data.is_overdue', true)
            ->assertJsonPath('data.lifecycle_stage', 'overdue');

        $this->postJson("/api/transactions/{$transaction->id}/return-items", [
            'items' => [['unit_id' => $items[0]->unit_id, 'condition' => 'Good']],
        ])->assertOk();
        $this->getJson("/api/transactions/{$transaction->id}")
            ->assertJsonPath('data.is_overdue', false)
            ->assertJsonPath('data.lifecycle_stage', 'returned');
    }

    public function test_transaction_event_uses_only_admin_laboratory_and_borrower_private_channels(): void
    {
        [$transaction] = $this->pendingTransaction(1);
        $channels = (new TransactionUpdated($transaction->fresh()))->broadcastOn();

        $this->assertSame([
            'private-transactions.admin',
            'private-transactions.lab.'.$transaction->laboratory_id,
            'private-transactions.user.'.$transaction->borrower_id,
        ], array_map(fn ($channel) => $channel->name, $channels));
    }

    /** @return array{Transaction,Collection<int,EquipmentItem>,User,Laboratory} */
    private function pendingTransaction(int $quantity): array
    {
        $borrower = User::factory()->create([
            'role' => 'user',
            'address' => '1 School Road',
            'phone_number' => '09170000000',
        ]);
        $admin = User::factory()->create(['role' => 'admin']);
        $laboratory = Laboratory::create([
            'name' => 'Custody workflow laboratory',
            'location' => 'Building A',
            'description' => 'Workflow tests',
            'isActive' => true,
        ]);
        $equipment = Equipment::create([
            'name' => 'Microscope',
            'laboratory_id' => $laboratory->id,
            'description' => 'Compound microscope',
            'isActive' => true,
        ]);
        $items = collect(range(1, $quantity))->map(fn () => EquipmentItem::create([
            'equipment_id' => $equipment->id,
            'condition' => 'Good',
        ]));

        Sanctum::actingAs($borrower, ['app:use']);
        $transactionId = $this->postJson('/api/transactions', [
            'laboratory_id' => $laboratory->id,
            'borrow_date' => today()->toDateString(),
            'equipment' => [['equipment_id' => $equipment->id, 'quantity' => $quantity]],
        ])->assertCreated()->json('data.id');

        return [Transaction::findOrFail($transactionId), $items, $admin, $laboratory];
    }

    private function approveAndIssue(Transaction $transaction, $items, ?string $dueDate = null): void
    {
        $this->postJson("/api/transactions/{$transaction->id}/accept", [
            'return_date' => $dueDate ?? today()->addWeek()->toDateString(),
        ])->assertOk();
        $this->postJson("/api/transactions/{$transaction->id}/issue", [
            'unit_ids' => $items->pluck('unit_id')->all(),
        ])->assertOk();
    }
}
