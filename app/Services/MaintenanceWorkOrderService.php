<?php

namespace App\Services;

use App\Enums\EquipmentCondition;
use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use App\Enums\MaintenanceType;
use App\Models\EquipmentItem;
use App\Models\MaintenanceWorkOrder;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MaintenanceWorkOrderService
{
    public function create(array $data, User $actor): MaintenanceWorkOrder
    {
        return DB::transaction(function () use ($data, $actor) {
            $item = EquipmentItem::query()
                ->with('equipment:id,name,laboratory_id')
                ->lockForUpdate()
                ->findOrFail($data['equipment_item_id']);
            $laboratoryId = (int) $item->equipment->laboratory_id;

            if (! $actor->managesLaboratory($laboratoryId)) {
                abort(403);
            }

            $this->ensureUnitCanEnterMaintenance($item);
            $this->ensureNoActiveWorkOrder($item);
            $assignee = $this->resolveAssignee($data['assigned_to_id'] ?? null, $laboratoryId);
            $conditionBefore = $item->condition;

            $item->update([
                'condition' => EquipmentCondition::UnderRepair->value,
                'isBorrowed' => false,
            ]);

            $workOrder = MaintenanceWorkOrder::create([
                ...Arr::except($data, ['assigned_to_id']),
                'laboratory_id' => $laboratoryId,
                'status' => $assignee ? MaintenanceStatus::Assigned->value : MaintenanceStatus::Open->value,
                'priority' => $data['priority'] ?? MaintenancePriority::Normal->value,
                'condition_before' => $conditionBefore,
                'assigned_to_id' => $assignee?->id,
                'assigned_to_name' => $assignee?->name,
                'reported_by_id' => $actor->id,
                'reported_by_name' => $actor->name,
            ]);

            return $this->fresh($workOrder);
        });
    }

    public function createFromReturn(
        EquipmentItem $item,
        Transaction $transaction,
        User $actor,
        string $conditionBefore,
        string $returnCondition,
        ?string $notes,
    ): MaintenanceWorkOrder {
        $existing = MaintenanceWorkOrder::query()
            ->where('equipment_item_id', $item->id)
            ->active()
            ->lockForUpdate()
            ->first();

        if ($existing) {
            return $existing;
        }

        $isMissing = $returnCondition === EquipmentCondition::Missing->value;
        $title = $isMissing
            ? "Missing unit {$item->unit_id} reported on return"
            : "Return inspection required for {$item->unit_id}";

        return MaintenanceWorkOrder::create([
            'equipment_item_id' => $item->id,
            'laboratory_id' => $transaction->laboratory_id,
            'source_transaction_id' => $transaction->id,
            'type' => $isMissing ? MaintenanceType::Incident->value : MaintenanceType::Repair->value,
            'status' => MaintenanceStatus::Open->value,
            'priority' => $isMissing ? MaintenancePriority::Critical->value : MaintenancePriority::High->value,
            'title' => $title,
            'description' => $notes,
            'condition_before' => $conditionBefore,
            'reported_by_id' => $actor->id,
            'reported_by_name' => $actor->name,
            'scheduled_at' => now(),
        ]);
    }

    public function update(MaintenanceWorkOrder $workOrder, array $data): MaintenanceWorkOrder
    {
        return DB::transaction(function () use ($workOrder, $data) {
            $locked = MaintenanceWorkOrder::query()->lockForUpdate()->findOrFail($workOrder->id);
            $this->ensureActive($locked);
            $this->ensureScheduleOrder($locked, $data);
            $assignee = array_key_exists('assigned_to_id', $data)
                ? $this->resolveAssignee($data['assigned_to_id'], $locked->laboratory_id)
                : null;

            if (array_key_exists('assigned_to_id', $data)) {
                $data['assigned_to_name'] = $assignee?->name;
                $targetStatus = $data['status'] ?? $locked->status->value;
                if (in_array($targetStatus, [MaintenanceStatus::Open->value, MaintenanceStatus::Assigned->value], true)) {
                    $data['status'] = $assignee
                        ? MaintenanceStatus::Assigned->value
                        : MaintenanceStatus::Open->value;
                }
            }

            if (($data['status'] ?? null) === MaintenanceStatus::InProgress->value && ! $locked->started_at) {
                $data['started_at'] = now();
            }

            $locked->update($data);

            return $this->fresh($locked);
        });
    }

    public function start(MaintenanceWorkOrder $workOrder): MaintenanceWorkOrder
    {
        return DB::transaction(function () use ($workOrder) {
            $locked = MaintenanceWorkOrder::query()->lockForUpdate()->findOrFail($workOrder->id);
            $this->ensureActive($locked);
            $item = EquipmentItem::query()->lockForUpdate()->findOrFail($locked->equipment_item_id);
            $this->ensureUnitCanEnterMaintenance($item);

            $item->update([
                'condition' => EquipmentCondition::UnderRepair->value,
                'isBorrowed' => false,
            ]);
            $locked->update([
                'status' => MaintenanceStatus::InProgress->value,
                'started_at' => $locked->started_at ?? now(),
            ]);

            return $this->fresh($locked);
        });
    }

    public function complete(MaintenanceWorkOrder $workOrder, array $data): MaintenanceWorkOrder
    {
        return DB::transaction(function () use ($workOrder, $data) {
            $locked = MaintenanceWorkOrder::query()->lockForUpdate()->findOrFail($workOrder->id);
            $this->ensureActive($locked);
            $item = EquipmentItem::query()->lockForUpdate()->findOrFail($locked->equipment_item_id);

            if ($item->isBorrowed) {
                throw ValidationException::withMessages([
                    'equipment_item_id' => ['A borrowed or reserved unit cannot complete maintenance.'],
                ]);
            }

            $completedAt = now();
            $recurrenceDays = $data['recurrence_interval_days'] ?? $locked->recurrence_interval_days;

            $item->update([
                'condition' => $data['result_condition'],
                'isBorrowed' => false,
            ]);
            $locked->update([
                ...$data,
                'status' => MaintenanceStatus::Completed->value,
                'completed_at' => $completedAt,
                'recurrence_interval_days' => $recurrenceDays,
                'next_due_at' => $recurrenceDays ? $completedAt->copy()->addDays((int) $recurrenceDays) : null,
            ]);

            return $this->fresh($locked);
        });
    }

    public function cancel(MaintenanceWorkOrder $workOrder, string $reason): MaintenanceWorkOrder
    {
        return DB::transaction(function () use ($workOrder, $reason) {
            $locked = MaintenanceWorkOrder::query()->lockForUpdate()->findOrFail($workOrder->id);
            $this->ensureActive($locked);
            $item = EquipmentItem::query()->lockForUpdate()->findOrFail($locked->equipment_item_id);

            if (! $item->isBorrowed && $item->condition === EquipmentCondition::UnderRepair->value) {
                $item->update(['condition' => $locked->condition_before ?: EquipmentCondition::Good->value]);
            }

            $locked->update([
                'status' => MaintenanceStatus::Cancelled->value,
                'completion_notes' => $reason,
                'completed_at' => now(),
            ]);

            return $this->fresh($locked);
        });
    }

    private function ensureUnitCanEnterMaintenance(EquipmentItem $item): void
    {
        if ($item->isBorrowed) {
            throw ValidationException::withMessages([
                'equipment_item_id' => ['Return or release this unit before starting maintenance.'],
            ]);
        }
    }

    private function ensureNoActiveWorkOrder(EquipmentItem $item): void
    {
        if ($item->maintenanceWorkOrders()->active()->exists()) {
            throw ValidationException::withMessages([
                'equipment_item_id' => ['This unit already has an active maintenance work order.'],
            ]);
        }
    }

    private function ensureActive(MaintenanceWorkOrder $workOrder): void
    {
        if (! in_array($workOrder->status->value, MaintenanceStatus::activeValues(), true)) {
            throw ValidationException::withMessages([
                'status' => ['Completed or cancelled work orders cannot be changed.'],
            ]);
        }
    }

    private function ensureScheduleOrder(MaintenanceWorkOrder $workOrder, array $data): void
    {
        $scheduledAt = array_key_exists('scheduled_at', $data)
            ? ($data['scheduled_at'] ? Carbon::parse($data['scheduled_at']) : null)
            : $workOrder->scheduled_at;
        $dueAt = array_key_exists('due_at', $data)
            ? ($data['due_at'] ? Carbon::parse($data['due_at']) : null)
            : $workOrder->due_at;

        if ($scheduledAt && $dueAt && $dueAt->lt($scheduledAt)) {
            throw ValidationException::withMessages([
                'due_at' => ['The due date must be after or equal to the scheduled date.'],
            ]);
        }
    }

    private function resolveAssignee(?int $assigneeId, int $laboratoryId): ?User
    {
        if (! $assigneeId) {
            return null;
        }

        $assignee = User::query()->where('isActive', true)->findOrFail($assigneeId);

        if (! $assignee->isAdmin() && ! $assignee->managesLaboratory($laboratoryId)) {
            throw ValidationException::withMessages([
                'assigned_to_id' => ['Assign an administrator or a custodian who manages this laboratory.'],
            ]);
        }

        return $assignee;
    }

    private function fresh(MaintenanceWorkOrder $workOrder): MaintenanceWorkOrder
    {
        return $workOrder->fresh([
            'item:id,equipment_id,unit_id,condition,isBorrowed',
            'item.equipment:id,name,laboratory_id',
            'laboratory:id,name,location',
            'assignedTo:id,name,email',
            'reportedBy:id,name,email',
        ]);
    }
}
