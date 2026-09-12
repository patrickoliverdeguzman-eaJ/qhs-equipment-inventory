<?php

namespace App\Services;

use App\Enums\EquipmentCondition;
use App\Models\Equipment;
use App\Models\InventorySnapshot;
use Illuminate\Support\Carbon;

class InventorySnapshotService
{
    public function capture(Carbon|string|null $date = null): int
    {
        $snapshotDate = $date instanceof Carbon
            ? $date->toDateString()
            : ($date ?? now()->toDateString());

        $equipment = Equipment::query()
            ->withCount([
                'items as total_items',
                'items as borrowed_items' => fn ($query) => $query
                    ->where('isBorrowed', true)
                    ->whereNotIn('condition', EquipmentCondition::unavailableValues()),
                'items as unavailable_items' => fn ($query) => $query
                    ->whereIn('condition', EquipmentCondition::unavailableValues()),
            ])
            ->get();

        foreach ($equipment as $item) {
            InventorySnapshot::updateOrCreate(
                [
                    'snapshot_date' => $snapshotDate,
                    'equipment_id' => $item->id,
                    'laboratory_id' => $item->laboratory_id,
                ],
                [
                    'total_items' => $item->total_items,
                    'borrowed_count' => $item->borrowed_items,
                    'available_count' => max(0, $item->total_items - $item->borrowed_items - $item->unavailable_items),
                ]
            );
        }

        return $equipment->count();
    }
}
