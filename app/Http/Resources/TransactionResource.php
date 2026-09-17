<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $assignedItems = $this->relationLoaded('assignedItems') ? $this->assignedItems : collect();
        $assigned = $assignedItems->groupBy('equipment_id');
        $equipment = $this->relationLoaded('equipment')
            ? $this->equipment->map(function ($equipment) use ($assigned) {
                $items = $assigned->get($equipment->id, collect());

                return [
                    'id' => $equipment->id,
                    'name' => $equipment->name,
                    'quantity' => (int) $equipment->pivot->quantity,
                    'items' => $items->map(fn ($item) => [
                        'id' => $item->id,
                        'unit_id' => $item->unit_id,
                        'condition' => $item->condition,
                        'issued_at' => $item->pivot->issued_at,
                        'condition_at_issue' => $item->pivot->condition_at_issue,
                        'returned_at' => $item->pivot->returned_at,
                        'condition_at_return' => $item->pivot->condition_at_return,
                        'return_notes' => $item->pivot->return_notes,
                        'returned_by_id' => $item->pivot->returned_by_id,
                        'returned_by_name' => $item->pivot->returned_by_name,
                    ])->values(),
                ];
            })->values()
            : collect();

        $summary = collect($equipment)->map(function (array $entry) {
            $units = collect($entry['items'])->pluck('unit_id')->filter()->implode(', ');
            $line = "{$entry['name']} ×{$entry['quantity']}";

            return $units ? "{$line} ({$units})" : $line;
        })->implode(' • ');

        $totalCount = $assignedItems->count();
        $issuedCount = $assignedItems->filter(fn ($item) => filled($item->pivot->issued_at))->count();
        $returnedCount = $assignedItems->filter(fn ($item) => filled($item->pivot->returned_at))->count();
        $outstandingCount = $assignedItems->filter(
            fn ($item) => filled($item->pivot->issued_at) && blank($item->pivot->returned_at),
        )->count();
        $dueDate = $this->return_date ? Carbon::parse($this->return_date)->endOfDay() : null;
        $isOverdue = $this->status === 'borrowed'
            && $outstandingCount > 0
            && $dueDate?->isPast();
        $isDueToday = $this->status === 'borrowed'
            && $outstandingCount > 0
            && $dueDate?->isToday();
        $lifecycleStage = match (true) {
            $this->status === 'borrowed' && $returnedCount > 0 && $outstandingCount > 0 => 'partially_returned',
            $isOverdue => 'overdue',
            default => $this->status,
        };

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
            'lifecycle_stage' => $lifecycleStage,
            'is_overdue' => $isOverdue,
            'is_due_today' => $isDueToday,
            'total_assigned_count' => $totalCount,
            'issued_count' => $issuedCount,
            'returned_count' => $returnedCount,
            'outstanding_count' => $outstandingCount,
            'notes' => $this->notes,
            'rejection_reason' => $this->rejection_reason,
            'accepted_at' => $this->accepted_at,
            'approved_at' => $this->accepted_at,
            'accepted_by_id' => $this->accepted_by_id,
            'approved_by_id' => $this->accepted_by_id,
            'approved_by_name' => $this->accepted_by_name,
            'issued_at' => $this->issued_at,
            'issued_by_id' => $this->issued_by_id,
            'issued_by_name' => $this->issued_by_name,
            'issue_notes' => $this->issue_notes,
            'returned_at' => $this->returned_at,
            'returned_by_id' => $this->returned_by_id,
            'rejected_at' => $this->rejected_at,
            'rejected_by_id' => $this->rejected_by_id,
            'accepted_by_name' => $this->accepted_by_name,
            'returned_by_name' => $this->returned_by_name,
            'rejected_by_name' => $this->rejected_by_name,
            'equipment_summary' => $summary,
            'equipment' => $this->when($this->relationLoaded('equipment'), $equipment),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
