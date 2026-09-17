<?php

namespace Tests\Feature;

use App\Models\Equipment;
use App\Models\EquipmentItem;
use App\Models\Laboratory;
use App\Models\MaintenanceWorkOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MaintenanceWorkOrderWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_manage_work_order_lifecycle_and_restore_availability(): void
    {
        [$laboratory, $equipment, $item, $admin] = $this->inventory();
        Sanctum::actingAs($admin, ['app:use']);

        $workOrderId = $this->postJson('/api/maintenance-work-orders', [
            'equipment_item_id' => $item->id,
            'type' => 'calibration',
            'priority' => 'high',
            'title' => 'Annual microscope calibration',
            'description' => 'Verify optical alignment and stage movement.',
            'scheduled_at' => now()->addDay()->toISOString(),
            'due_at' => now()->addDays(2)->toISOString(),
            'recurrence_interval_days' => 365,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.current_condition', 'Under Repair')
            ->assertJsonPath('data.laboratory_id', $laboratory->id)
            ->json('data.id');

        $this->assertSame('Under Repair', $item->fresh()->condition);
        $this->getJson("/api/equipment/{$equipment->id}/available-items")
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->patchJson("/api/maintenance-work-orders/{$workOrderId}", [
            'assigned_to_id' => $admin->id,
            'status' => 'open',
        ])->assertOk()->assertJsonPath('data.status', 'assigned');
        $this->patchJson("/api/maintenance-work-orders/{$workOrderId}", [
            'assigned_to_id' => null,
            'status' => 'assigned',
        ])->assertOk()->assertJsonPath('data.status', 'open');
        $this->patchJson("/api/maintenance-work-orders/{$workOrderId}", [
            'due_at' => now()->toISOString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('due_at');

        $this->postJson("/api/maintenance-work-orders/{$workOrderId}/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->postJson("/api/maintenance-work-orders/{$workOrderId}/complete", [
            'result_condition' => 'Good',
            'completion_notes' => 'Calibration passed within tolerance.',
            'actual_cost' => 250,
            'recurrence_interval_days' => 365,
        ])->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.result_condition', 'Good');

        $this->assertSame('Good', $item->fresh()->condition);
        $this->assertNotNull(MaintenanceWorkOrder::findOrFail($workOrderId)->next_due_at);
        $this->getJson("/api/equipment/{$equipment->id}/available-items")
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->assertDatabaseHas('action_logs', ['action' => 'maintenance_created']);
        $this->assertDatabaseHas('action_logs', ['action' => 'maintenance_started']);
        $this->assertDatabaseHas('action_logs', ['action' => 'maintenance_completed']);
    }

    public function test_damaged_return_automatically_opens_a_linked_work_order(): void
    {
        [$laboratory, $equipment, $item, $admin] = $this->inventory();
        $borrower = User::factory()->create([
            'role' => 'user',
            'address' => '1 School Road',
            'phone_number' => '09170000000',
        ]);

        Sanctum::actingAs($borrower, ['app:use']);
        $transactionId = $this->postJson('/api/transactions', [
            'laboratory_id' => $laboratory->id,
            'borrow_date' => today()->toDateString(),
            'equipment' => [['equipment_id' => $equipment->id, 'quantity' => 1]],
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($admin, ['app:use']);
        $this->postJson("/api/transactions/{$transactionId}/accept", [
            'return_date' => today()->addWeek()->toDateString(),
        ])->assertOk();
        $this->postJson("/api/transactions/{$transactionId}/issue", [
            'unit_ids' => [$item->unit_id],
        ])->assertOk();
        $this->postJson("/api/transactions/{$transactionId}/return-items", [
            'items' => [[
                'unit_id' => $item->unit_id,
                'condition' => 'Damaged',
                'notes' => 'Objective lens is cracked.',
            ]],
        ])->assertOk();

        $this->assertDatabaseHas('maintenance_work_orders', [
            'equipment_item_id' => $item->id,
            'laboratory_id' => $laboratory->id,
            'source_transaction_id' => $transactionId,
            'type' => 'repair',
            'status' => 'open',
            'priority' => 'high',
        ]);
        $this->assertSame('Damaged', $item->fresh()->condition);

        $this->getJson("/api/item/{$item->unit_id}/history")
            ->assertOk()
            ->assertJsonPath('data.maintenance.0.source_transaction_id', $transactionId)
            ->assertJsonPath('data.maintenance.0.title', "Return inspection required for {$item->unit_id}");
    }

    public function test_cancelling_restores_condition_and_terminal_records_cannot_change(): void
    {
        [, , $item, $admin] = $this->inventory();
        Sanctum::actingAs($admin, ['app:use']);

        $workOrderId = $this->postJson('/api/maintenance-work-orders', [
            'equipment_item_id' => $item->id,
            'type' => 'cleaning',
            'title' => 'Deep clean after storage',
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/maintenance-work-orders/{$workOrderId}/cancel", [
            'reason' => 'Work order opened for the wrong unit.',
        ])->assertOk()->assertJsonPath('data.status', 'cancelled');

        $this->assertSame('Good', $item->fresh()->condition);
        $this->patchJson("/api/maintenance-work-orders/{$workOrderId}", [
            'title' => 'Should not change',
        ])->assertUnprocessable();
    }

    public function test_custodian_scope_and_assignee_are_laboratory_restricted(): void
    {
        [$laboratory, , $item] = $this->inventory();
        $custodian = User::factory()->create(['role' => 'custodian']);
        $custodian->laboratories()->attach($laboratory);
        $otherCustodian = User::factory()->create(['role' => 'custodian']);
        Sanctum::actingAs($custodian, ['app:use']);

        $this->postJson('/api/maintenance-work-orders', [
            'equipment_item_id' => $item->id,
            'type' => 'safety_inspection',
            'title' => 'Electrical safety inspection',
            'assigned_to_id' => $otherCustodian->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('assigned_to_id');

        $otherLab = Laboratory::create([
            'name' => 'Restricted laboratory',
            'location' => 'Building B',
            'description' => 'Not managed by this custodian',
            'isActive' => true,
        ]);
        $otherEquipment = Equipment::create([
            'name' => 'Restricted centrifuge',
            'laboratory_id' => $otherLab->id,
            'isActive' => true,
        ]);
        $otherItem = EquipmentItem::create(['equipment_id' => $otherEquipment->id, 'condition' => 'Good']);

        $this->postJson('/api/maintenance-work-orders', [
            'equipment_item_id' => $otherItem->id,
            'type' => 'repair',
            'title' => 'Unauthorized repair',
        ])->assertForbidden();
    }

    /** @return array{Laboratory,Equipment,EquipmentItem,User} */
    private function inventory(): array
    {
        $laboratory = Laboratory::create([
            'name' => 'Maintenance laboratory',
            'location' => 'Science building',
            'description' => 'Maintenance workflow tests',
            'isActive' => true,
        ]);
        $equipment = Equipment::create([
            'name' => 'Microscope',
            'laboratory_id' => $laboratory->id,
            'description' => 'Compound microscope',
            'isActive' => true,
        ]);
        $item = EquipmentItem::create([
            'equipment_id' => $equipment->id,
            'condition' => 'Good',
        ]);
        $admin = User::factory()->create(['role' => 'admin']);

        return [$laboratory, $equipment, $item, $admin];
    }
}
