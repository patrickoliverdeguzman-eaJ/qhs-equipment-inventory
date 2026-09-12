<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $assigned = $this->whenLoaded('assignedItems', fn () => $this->assignedItems->groupBy('equipment_id'));
        $equipment = $this->whenLoaded('equipment', function () use ($assigned) {
            return $this->equipment->map(function ($equipment) use ($assigned) {
                $items = $assigned->get($equipment->id, collect());

                return [
                    'id' => $equipment->id,
                    'name' => $equipment->name,
                    'quantity' => (int) $equipment->pivot->quantity,
                    'items' => $items->map(fn ($item) => [
                        'id' => $item->id,
                        'unit_id' => $item->unit_id,
                        'condition' => $item->condition,
                    ])->values(),
                ];
            })->values();
        });

        $summary = collect($equipment)->map(function (array $entry) {
            $units = collect($entry['items'])->pluck('unit_id')->filter()->implode(', ');
            $line = "{$entry['name']} ×{$entry['quantity']}";

            return $units ? "{$line} ({$units})" : $line;
        })->implode(' • ');

        return [
            'id' => $this->id,
            'borrower_id' => $this->borrower_id,
            'borrower_name' => $this->borrower_name,
            'borrower_email' => $this->borrower_email,
            'borrower_contact' => $this->borrower_contact,
            'borrower' => $this->whenLoaded('borrower'),
            'laboratory_id' => $this->laboratory_id,
            'laboratory' => $this->whenLoaded('laboratory'),
            'borrow_date' => $this->borrow_date,
            'return_date' => $this->return_date,
            'status' => $this->status,
            'notes' => $this->notes,
            'rejection_reason' => $this->rejection_reason,
            'accepted_at' => $this->accepted_at,
            'returned_at' => $this->returned_at,
            'rejected_at' => $this->rejected_at,
            'accepted_by_name' => $this->accepted_by_name,
            'returned_by_name' => $this->returned_by_name,
            'rejected_by_name' => $this->rejected_by_name,
            'equipment_summary' => $summary,
            'equipment' => $equipment,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
