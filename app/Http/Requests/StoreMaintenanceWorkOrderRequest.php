<?php

namespace App\Http\Requests;

use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceType;
use App\Models\MaintenanceWorkOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', MaintenanceWorkOrder::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'equipment_item_id' => ['required', 'integer', 'exists:equipment_items,id'],
            'type' => ['required', Rule::enum(MaintenanceType::class)],
            'priority' => ['sometimes', Rule::enum(MaintenancePriority::class)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'assigned_to_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->whereIn('role', ['admin', 'custodian'])
                    ->where('isActive', true)),
            ],
            'scheduled_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date', 'after_or_equal:scheduled_at'],
            'service_provider' => ['nullable', 'string', 'max:255'],
            'estimated_cost' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'recurrence_interval_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
        ];
    }
}
