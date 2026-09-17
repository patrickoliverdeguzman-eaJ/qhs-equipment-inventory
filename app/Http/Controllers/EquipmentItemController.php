<?php

namespace App\Http\Controllers;

use App\Enums\EquipmentCondition;
use App\Http\Requests\StoreItemRequest;
use App\Http\Requests\UpdateItemRequest;
use App\Http\Resources\EquipmentItemResource;
use App\Models\Equipment;
use App\Models\EquipmentItem;
use App\Traits\ActionLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EquipmentItemController extends Controller
{
    use ActionLogger;

    public function index(Request $request)
    {
        $query = EquipmentItem::query()->with('equipment:id,laboratory_id,isActive');
        $user = $request->user();

        if ($user->isCustodian()) {
            $query->whereHas('equipment.laboratory.custodians', fn (Builder $builder) => $builder->whereKey($user->id));
        } elseif ($user->role === 'user') {
            $query->whereHas('equipment', fn (Builder $builder) => $builder
                ->where('isActive', true)
                ->whereHas('laboratory', fn (Builder $laboratory) => $laboratory->where('isActive', true)));
        }

        return EquipmentItemResource::collection($query->latest('id')->limit(2000)->get());
    }

    public function store(StoreItemRequest $request)
    {
        $data = $request->safe()->except('isBorrowed');

        $item = DB::transaction(function () use ($data) {
            $equipment = Equipment::query()->lockForUpdate()->findOrFail($data['equipment_id']);
            $data['unit_id'] = EquipmentItem::generateUnitId($equipment->id);
            $data['isBorrowed'] = false;

            return EquipmentItem::create($data);
        });

        $this->logAction('equipment_item_created', [
            'item_id' => $item->id,
            'equipment_id' => $item->equipment_id,
        ]);

        return (new EquipmentItemResource($item))->response()->setStatusCode(201);
    }

    public function show(Request $request, EquipmentItem $item)
    {
        $this->authorize('manageItems', $item->equipment);

        return new EquipmentItemResource($item);
    }

    public function update(UpdateItemRequest $request, EquipmentItem $item)
    {
        if ($item->isBorrowed && $request->filled('condition') && $request->string('condition')->toString() !== $item->condition) {
            throw ValidationException::withMessages([
                'condition' => ['Return this unit before changing its condition.'],
            ]);
        }

        $item->update($request->safe()->only('condition'));
        $this->logAction('equipment_item_updated', ['item_id' => $item->id]);

        return new EquipmentItemResource($item->fresh());
    }

    public function destroy(EquipmentItem $item)
    {
        if ($item->isBorrowed || $item->transactions()->exists()) {
            throw ValidationException::withMessages([
                'item' => ['This unit has borrowing history and cannot be deleted.'],
            ]);
        }

        $item->delete();
        $this->logAction('equipment_item_deleted', ['item_id' => $item->id]);

        return response()->noContent();
    }

    public function availableItems(Request $request, Equipment $equipment)
    {
        if ($request->user()->role === 'user' && (
            ! $equipment->isActive || ! $equipment->laboratory()->value('isActive')
        )) {
            abort(404);
        }

        $this->authorize('view', $equipment);

        return EquipmentItemResource::collection(
            $equipment->items()
                ->where('isBorrowed', false)
                ->whereNotIn('condition', EquipmentCondition::unavailableValues())
                ->orderBy('unit_id')
                ->get()
        );
    }
}
