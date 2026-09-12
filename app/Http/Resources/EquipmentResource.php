<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentResource extends JsonResource
{
    private const UNAVAILABLE_STATUSES = ['damaged', 'missing', 'under_repair'];

    public function toArray($request)
    {
        $items = $this->items ?? collect();

        $total = $items->count();
        $borrowed = $items->where('isBorrowed', true)->count();
        // Handle condition field
        $unavailable = $items->filter(function ($item) {
            $condition = $item->condition ?? null;

            // Unavailable if condition is Damaged, Missing, or Under Repair
            return in_array($condition, ['Damaged', 'Missing', 'Under Repair']);
        })->count();

        $available = $total - $borrowed - $unavailable;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description ?? '',
            'image' => $this->image,
            'laboratory_id' => $this->laboratory_id,
            'isActive' => (bool) $this->isActive,

            // THESE ARE NOW CORRECT
            'total_quantity' => $total,
            'borrowed_quantity' => $borrowed,
            'available_quantity' => $available,
            'quantity' => $available, // legacy field

            'categories' => $this->whenLoaded('categories', function () {
                return $this->categories->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                ]);
            }),

            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(fn ($i) => [
                    'id' => $i->id,
                    'unit_id' => $i->unit_id,
                    'condition' => $i->condition,
                    'isBorrowed' => (bool) $i->isBorrowed,
                ]);
            }),
        ];
    }
}
