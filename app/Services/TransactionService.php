<?php

namespace App\Services;

use App\Enums\EquipmentCondition;
use App\Events\TransactionUpdated;
use App\Models\Equipment;
use App\Models\EquipmentItem;
use App\Models\Laboratory;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionService
{
    public function create(array $data, User $actor): Transaction
    {
        $transaction = DB::transaction(function () use ($data, $actor) {
            $requested = $this->validateRequestLines($data, $actor);
            $payload = Arr::except($data, 'equipment');

            $payload = array_merge($payload, $this->borrowerIdentity($payload, $actor));

            $payload['status'] = 'pending';
            $transaction = Transaction::create($payload);
            $this->syncRequestedEquipment($transaction, $requested);
            $this->reserveRequestedItems($transaction, $requested);

            return $transaction;
        });

        return $this->publish($transaction);
    }

    public function updatePending(Transaction $transaction, array $data, User $actor): Transaction
    {
        $updated = DB::transaction(function () use ($transaction, $data, $actor) {
            $locked = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => ['Only pending requests can be fully edited.'],
                ]);
            }

            $requested = $this->validateRequestLines($data, $actor);
            $payload = Arr::except($data, 'equipment');

            $payload = array_merge($payload, $this->borrowerIdentity($payload, $actor));

            $this->releaseItems($locked, detach: true);
            $locked->update($payload);
            $this->syncRequestedEquipment($locked, $requested);
            $this->reserveRequestedItems($locked, $requested);

            return $locked;
        });

        return $this->publish($updated);
    }

    public function updateProcessed(Transaction $transaction, array $data): Transaction
    {
        $allowed = ['notes'];

        if ($transaction->status === 'borrowed') {
            $allowed[] = 'return_date';

            if (! empty($data['return_date']) && $data['return_date'] < $transaction->borrow_date) {
                throw ValidationException::withMessages([
                    'return_date' => ['The return date cannot be before the borrow date.'],
                ]);
            }
        }

        $transaction->update(Arr::only($data, $allowed));

        return $this->publish($transaction);
    }

    public function accept(Transaction $transaction, User $actor): Transaction
    {
        $accepted = DB::transaction(function () use ($transaction, $actor) {
            $locked = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => ['This request has already been processed.'],
                ]);
            }

            if (! $locked->assignedItems()->exists()) {
                $requested = $locked->equipment()->get()->map(fn (Equipment $equipment) => [
                    'equipment_id' => $equipment->id,
                    'quantity' => (int) $equipment->pivot->quantity,
                ]);
                $this->reserveRequestedItems($locked, $requested);
            }

            $locked->update([
                'status' => 'borrowed',
                'accepted_at' => now(),
                'accepted_by_name' => $actor->name,
            ]);

            return $locked;
        });

        return $this->publish($accepted);
    }

    public function decline(Transaction $transaction, User $actor, ?string $reason): Transaction
    {
        $declined = DB::transaction(function () use ($transaction, $actor, $reason) {
            $locked = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => ['This request has already been processed.'],
                ]);
            }

            $this->releaseItems($locked);
            $locked->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejected_by_name' => $actor->name,
                'rejection_reason' => $reason,
            ]);

            return $locked;
        });

        return $this->publish($declined);
    }

    public function markReturned(Transaction $transaction, User $actor): Transaction
    {
        $returned = DB::transaction(function () use ($transaction, $actor) {
            $locked = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($locked->status !== 'borrowed') {
                throw ValidationException::withMessages([
                    'status' => ['Only borrowed requests can be returned.'],
                ]);
            }

            $this->releaseItems($locked);
            $locked->update([
                'status' => 'returned',
                'returned_at' => now(),
                'returned_by_name' => $actor->name,
            ]);

            return $locked;
        });

        return $this->publish($returned);
    }

    public function replaceAssignedItems(Transaction $transaction, array $assignments): Transaction
    {
        $updated = DB::transaction(function () use ($transaction, $assignments) {
            $locked = Transaction::query()->lockForUpdate()->with('equipment')->findOrFail($transaction->id);

            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => ['Assigned units can only be changed while a request is pending.'],
                ]);
            }

            $requestedIds = $locked->equipment->pluck('id')->map(fn ($id) => (string) $id)->sort()->values();
            $assignedIds = collect(array_keys($assignments))->map(fn ($id) => (string) $id)->sort()->values();

            if ($requestedIds->all() !== $assignedIds->all()) {
                throw ValidationException::withMessages([
                    'assigned_items' => ['Assignments must exactly match the equipment in this request.'],
                ]);
            }

            foreach ($locked->equipment as $equipment) {
                $unitIds = $assignments[$equipment->id] ?? $assignments[(string) $equipment->id] ?? [];

                if (count($unitIds) !== (int) $equipment->pivot->quantity) {
                    throw ValidationException::withMessages([
                        'assigned_items' => ["Assign exactly {$equipment->pivot->quantity} unit(s) for {$equipment->name}."],
                    ]);
                }
            }

            $this->releaseItems($locked, detach: true);
            $itemIds = [];

            foreach ($assignments as $equipmentId => $unitIds) {
                $items = EquipmentItem::query()
                    ->where('equipment_id', $equipmentId)
                    ->whereIn('unit_id', array_values(array_unique($unitIds)))
                    ->lockForUpdate()
                    ->get();

                if ($items->count() !== count($unitIds)) {
                    throw ValidationException::withMessages([
                        'assigned_items' => ['One or more selected units do not exist for that equipment.'],
                    ]);
                }

                foreach ($items as $item) {
                    if ($item->isBorrowed || in_array($item->condition, EquipmentCondition::unavailableValues(), true)) {
                        throw ValidationException::withMessages([
                            'assigned_items' => ["Unit {$item->unit_id} is not available."],
                        ]);
                    }
                }

                $itemIds = [...$itemIds, ...$items->pluck('id')->all()];
            }

            EquipmentItem::whereIn('id', $itemIds)->update(['isBorrowed' => true]);
            $locked->assignedItems()->attach($itemIds);

            return $locked;
        });

        return $this->publish($updated);
    }

    public function delete(Transaction $transaction): void
    {
        DB::transaction(function () use ($transaction) {
            $locked = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if (! in_array($locked->status, ['pending', 'rejected'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Borrowed or returned transactions cannot be deleted.'],
                ]);
            }

            $this->releaseItems($locked, detach: true);
            $locked->delete();
        });
    }

    private function validateRequestLines(array $data, User $actor): Collection
    {
        $laboratoryId = (int) $data['laboratory_id'];
        $laboratory = Laboratory::findOrFail($laboratoryId);

        if ($actor->isCustodian() && ! $actor->managesLaboratory($laboratoryId)) {
            abort(403, 'You may only manage requests for a laboratory assigned to you.');
        }

        if ($actor->role === 'user' && ! $laboratory->isActive) {
            throw ValidationException::withMessages([
                'laboratory_id' => ['The selected laboratory is not accepting requests.'],
            ]);
        }

        $requested = collect($data['equipment'])->sortBy('equipment_id')->values();
        $equipment = Equipment::query()
            ->whereIn('id', $requested->pluck('equipment_id'))
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        foreach ($requested as $line) {
            $record = $equipment->get((int) $line['equipment_id']);

            if (! $record || $record->laboratory_id !== $laboratoryId) {
                throw ValidationException::withMessages([
                    'equipment' => ['Every requested item must belong to the selected laboratory.'],
                ]);
            }

            if ($actor->role === 'user' && ! $record->isActive) {
                throw ValidationException::withMessages([
                    'equipment' => ["{$record->name} is not currently available for requests."],
                ]);
            }
        }

        return $requested;
    }

    /** @return array{borrower_id:int,borrower_name:string,borrower_email:?string,borrower_contact:?string} */
    private function borrowerIdentity(array $payload, User $actor): array
    {
        $borrower = $actor->role === 'user'
            ? $actor
            : User::findOrFail($payload['borrower_id']);

        if (! $borrower->isActive || $borrower->role !== 'user') {
            throw ValidationException::withMessages([
                'borrower_id' => ['Borrow requests can only be created for active student accounts.'],
            ]);
        }

        return [
            'borrower_id' => $borrower->id,
            'borrower_name' => $borrower->name,
            'borrower_email' => $borrower->email,
            'borrower_contact' => $borrower->phone_number,
        ];
    }

    private function syncRequestedEquipment(Transaction $transaction, Collection $requested): void
    {
        $sync = $requested->mapWithKeys(fn (array $line) => [
            (int) $line['equipment_id'] => ['quantity' => (int) $line['quantity']],
        ])->all();

        $transaction->equipment()->sync($sync);
    }

    private function reserveRequestedItems(Transaction $transaction, Collection $requested): void
    {
        $itemIds = [];

        foreach ($requested as $line) {
            $items = EquipmentItem::query()
                ->where('equipment_id', $line['equipment_id'])
                ->where('isBorrowed', false)
                ->whereNotIn('condition', EquipmentCondition::unavailableValues())
                ->orderBy('id')
                ->lockForUpdate()
                ->limit((int) $line['quantity'])
                ->get();

            if ($items->count() !== (int) $line['quantity']) {
                $name = Equipment::whereKey($line['equipment_id'])->value('name') ?? 'Equipment';
                throw ValidationException::withMessages([
                    'equipment' => ["Not enough {$name} units are available."],
                ]);
            }

            $itemIds = [...$itemIds, ...$items->pluck('id')->all()];
        }

        EquipmentItem::whereIn('id', $itemIds)->update(['isBorrowed' => true]);
        $transaction->assignedItems()->attach($itemIds);
    }

    private function releaseItems(Transaction $transaction, bool $detach = false): void
    {
        $itemIds = $transaction->assignedItems()->lockForUpdate()->pluck('equipment_items.id');

        if ($itemIds->isNotEmpty()) {
            EquipmentItem::whereIn('id', $itemIds)->update(['isBorrowed' => false]);
        }

        if ($detach) {
            $transaction->assignedItems()->detach();
        }
    }

    private function publish(Transaction $transaction): Transaction
    {
        $fresh = $transaction->fresh(['borrower', 'laboratory', 'equipment', 'assignedItems']);
        broadcast(new TransactionUpdated($fresh));

        return $fresh;
    }
}
