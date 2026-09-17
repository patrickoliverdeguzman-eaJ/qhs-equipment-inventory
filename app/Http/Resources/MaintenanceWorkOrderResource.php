<?php

namespace App\Http\Resources;

use App\Enums\MaintenanceStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceWorkOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $status = $this->status->value;
        $isActive = in_array($status, MaintenanceStatus::activeValues(), true);

        return [
            'id' => $this->id,
            'equipment_item_id' => $this->equipment_item_id,
            'unit_id' => $this->item?->unit_id,
            'equipment_id' => $this->item?->equipment_id,
            'equipment_name' => $this->item?->equipment?->name,
            'current_condition' => $this->item?->condition,
            'laboratory_id' => $this->laboratory_id,
            'laboratory' => $this->whenLoaded('laboratory'),
            'source_transaction_id' => $this->source_transaction_id,
            'type' => $this->type->value,
            'status' => $status,
            'priority' => $this->priority->value,
            'title' => $this->title,
            'description' => $this->description,
            'condition_before' => $this->condition_before,
            'assigned_to_id' => $this->assigned_to_id,
            'assigned_to_name' => $this->assigned_to_name,
            'reported_by_id' => $this->reported_by_id,
            'reported_by_name' => $this->reported_by_name,
            'scheduled_at' => $this->scheduled_at,
            'due_at' => $this->due_at,
            'started_at' => $this->started_at,
            'completed_at' => $this->completed_at,
            'service_provider' => $this->service_provider,
            'estimated_cost' => $this->estimated_cost,
            'actual_cost' => $this->actual_cost,
            'completion_notes' => $this->completion_notes,
            'result_condition' => $this->result_condition,
            'recurrence_interval_days' => $this->recurrence_interval_days,
            'next_due_at' => $this->next_due_at,
            'is_overdue' => $isActive && $this->due_at?->isPast(),
            'is_due_soon' => $isActive && $this->due_at?->between(now(), now()->addDays(7)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
