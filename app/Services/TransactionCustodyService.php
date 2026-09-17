<?php

namespace App\Services;

use App\Enums\EquipmentCondition;
use App\Events\TransactionUpdated;
use App\Models\EquipmentItem;
use App\Models\Transaction;
use App\Models\TransactionEquipmentItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionCustodyService
{
    public function __construct(private readonly MaintenanceWorkOrderService $maintenance) {}

    public function issue(Transaction $transaction, User $actor, array $scans, ?string $notes): Transaction
    {
        $issued = DB::transaction(function () use ($transaction, $actor, $scans, $notes) {
            $locked = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($locked->status !== 'approved') {
                throw ValidationException::withMessages([
                    'status' => ['Only approved requests can be issued.'],
                ]);
            }

            if (! $locked->return_date) {
                throw ValidationException::withMessages([
                    'return_date' => ['A due date is required before equipment can be issued.'],
                ]);
            }

            $unitIds = $this->normalizeUnitIds($scans, 'unit_ids');
            $assignments = TransactionEquipmentItem::query()
                ->where('transaction_id', $locked->id)
                ->lockForUpdate()
                ->get();
            $items = EquipmentItem::query()
                ->whereIn('id', $assignments->pluck('equipment_item_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $assignedUnitIds = $assignments
                ->map(fn (TransactionEquipmentItem $assignment) => $items->get($assignment->equipment_item_id)?->unit_id)
                ->filter()
                ->sort()
                ->values();

            if ($unitIds->sort()->values()->all() !== $assignedUnitIds->all()) {
                throw ValidationException::withMessages([
                    'unit_ids' => ['Scan or select the exact set of units assigned to this request.'],
                ]);
            }

            $issuedAt = now();

            foreach ($assignments as $assignment) {
                $item = $items->get($assignment->equipment_item_id);

                if (! $item || ! $item->isBorrowed || in_array($item->condition, EquipmentCondition::unavailableValues(), true)) {
                    throw ValidationException::withMessages([
                        'unit_ids' => ["Unit {$item?->unit_id} is no longer usable or reserved for this request."],
                    ]);
                }

                if ($assignment->issued_at !== null) {
                    throw ValidationException::withMessages([
                        'unit_ids' => ["Unit {$item->unit_id} has already been issued."],
                    ]);
                }

                $assignment->update([
                    'issued_at' => $issuedAt,
                    'condition_at_issue' => $item->condition,
                ]);
            }

            $locked->update([
                'status' => 'borrowed',
                'issued_at' => $issuedAt,
                'issued_by_id' => $actor->id,
                'issued_by_name' => $actor->name,
                'issue_notes' => $notes,
            ]);

            return $locked;
        });

        return $this->publish($issued);
    }

    /**
     * @return array{transaction:Transaction,returned_count:int,completed:bool,attention_conditions:list<string>,unit_ids:list<string>,work_order_ids:list<int>}
     */
    public function returnItems(
        Transaction $transaction,
        User $actor,
        array $returnedItems,
        bool $allowBlankAttentionNotes = false,
    ): array {
        $result = DB::transaction(function () use ($transaction, $actor, $returnedItems, $allowBlankAttentionNotes) {
            $locked = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($locked->status !== 'borrowed') {
                throw ValidationException::withMessages([
                    'status' => ['Only issued equipment can be returned.'],
                ]);
            }

            $normalized = collect($returnedItems)->map(fn (array $item) => [
                ...$item,
                'unit_id' => $this->normalizeUnitId($item['unit_id']),
            ]);

            if ($normalized->pluck('unit_id')->duplicates()->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'items' => ['The same unit cannot be returned more than once in a request.'],
                ]);
            }

            $assignments = TransactionEquipmentItem::query()
                ->where('transaction_id', $locked->id)
                ->lockForUpdate()
                ->get();
            $equipmentItems = EquipmentItem::query()
                ->whereIn('id', $assignments->pluck('equipment_item_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $assignmentsByUnit = $assignments->keyBy(
                fn (TransactionEquipmentItem $assignment) => $equipmentItems->get($assignment->equipment_item_id)?->unit_id,
            );
            $returnedAt = now();
            $workOrderIds = collect();

            foreach ($normalized as $line) {
                $assignment = $assignmentsByUnit->get($line['unit_id']);

                if (! $assignment) {
                    throw ValidationException::withMessages([
                        'items' => ["Unit {$line['unit_id']} is not assigned to this request."],
                    ]);
                }

                if ($assignment->issued_at === null) {
                    throw ValidationException::withMessages([
                        'items' => ["Unit {$line['unit_id']} was not issued."],
                    ]);
                }

                if ($assignment->returned_at !== null) {
                    throw ValidationException::withMessages([
                        'items' => ["Unit {$line['unit_id']} has already been returned."],
                    ]);
                }

                if (
                    in_array($line['condition'], EquipmentCondition::unavailableValues(), true)
                    && blank($line['notes'] ?? null)
                    && ! $allowBlankAttentionNotes
                ) {
                    throw ValidationException::withMessages([
                        'items' => ["Notes are required for {$line['condition']} unit {$line['unit_id']}."],
                    ]);
                }

                $equipmentItem = $equipmentItems->get($assignment->equipment_item_id);
                $conditionBefore = $equipmentItem->condition;
                $equipmentItem->update([
                    'condition' => $line['condition'],
                    'isBorrowed' => false,
                ]);
                $assignment->update([
                    'returned_at' => $returnedAt,
                    'condition_at_return' => $line['condition'],
                    'return_notes' => $line['notes'] ?? null,
                    'returned_by_id' => $actor->id,
                    'returned_by_name' => $actor->name,
                ]);

                if (in_array($line['condition'], EquipmentCondition::unavailableValues(), true)) {
                    $workOrder = $this->maintenance->createFromReturn(
                        $equipmentItem,
                        $locked,
                        $actor,
                        $conditionBefore,
                        $line['condition'],
                        $line['notes'] ?? null,
                    );
                    $workOrderIds->push($workOrder->id);
                }
            }

            $outstanding = TransactionEquipmentItem::query()
                ->where('transaction_id', $locked->id)
                ->whereNotNull('issued_at')
                ->whereNull('returned_at')
                ->count();
            $completed = $outstanding === 0;

            if ($completed) {
                $locked->update([
                    'status' => 'returned',
                    'returned_at' => $returnedAt,
                    'returned_by_id' => $actor->id,
                    'returned_by_name' => $actor->name,
                ]);
            }

            return [
                'transaction' => $locked,
                'returned_count' => $normalized->count(),
                'completed' => $completed,
                'attention_conditions' => $normalized
                    ->pluck('condition')
                    ->filter(fn (string $condition) => in_array($condition, EquipmentCondition::unavailableValues(), true))
                    ->unique()
                    ->values()
                    ->all(),
                'unit_ids' => $normalized->pluck('unit_id')->values()->all(),
                'work_order_ids' => $workOrderIds->unique()->values()->all(),
            ];
        });

        $result['transaction'] = $this->publish($result['transaction']);

        return $result;
    }

    /** @return array{transaction:Transaction,returned_count:int,completed:bool,attention_conditions:list<string>,unit_ids:list<string>,work_order_ids:list<int>} */
    public function returnAllOutstanding(Transaction $transaction, User $actor): array
    {
        $outstanding = TransactionEquipmentItem::query()
            ->where('transaction_id', $transaction->id)
            ->whereNotNull('issued_at')
            ->whereNull('returned_at')
            ->with('item:id,unit_id,condition')
            ->get();

        if ($outstanding->isEmpty()) {
            throw ValidationException::withMessages([
                'items' => ['This transaction has no outstanding issued units.'],
            ]);
        }

        return $this->returnItems($transaction, $actor, $outstanding->map(fn ($assignment) => [
            'unit_id' => $assignment->item->unit_id,
            'condition' => $assignment->item->condition,
            'notes' => null,
        ])->all(), allowBlankAttentionNotes: true);
    }

    private function normalizeUnitIds(array $scans, string $field)
    {
        $unitIds = collect($scans)->map(fn (string $scan) => $this->normalizeUnitId($scan));

        if ($unitIds->contains('')) {
            throw ValidationException::withMessages([$field => ['Every scan must contain a valid unit ID.']]);
        }

        if ($unitIds->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages([$field => ['The same unit was scanned more than once.']]);
        }

        return $unitIds;
    }

    private function normalizeUnitId(string $scan): string
    {
        $value = trim($scan);
        $path = parse_url($value, PHP_URL_PATH);

        if (is_string($path) && str_contains($path, '/')) {
            $segments = array_values(array_filter(explode('/', trim($path, '/')), fn ($part) => $part !== ''));
            $historyIndex = array_search('item-history', $segments, true);

            if ($historyIndex !== false && isset($segments[$historyIndex + 1])) {
                return trim(rawurldecode($segments[$historyIndex + 1]));
            }

            return trim(rawurldecode(end($segments) ?: ''));
        }

        return $value;
    }

    private function publish(Transaction $transaction): Transaction
    {
        $fresh = $transaction->fresh([
            'borrower:id,name,email,avatar',
            'laboratory:id,name',
            'equipment:id,name',
            'assignedItems:id,equipment_id,unit_id,condition',
        ]);
        broadcast(new TransactionUpdated($fresh));

        return $fresh;
    }
}
