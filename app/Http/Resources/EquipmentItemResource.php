<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentItemResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'equipment_id' => $this->equipment_id,
            'unit_id' => $this->unit_id,
            'condition' => $this->condition ?? 'Good',
            'isBorrowed' => $this->isBorrowed,        // ← NOW REAL BOOLEAN
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
