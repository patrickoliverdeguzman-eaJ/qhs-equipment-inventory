<?php

namespace App\Http\Requests;

use App\Enums\EquipmentCondition;
use App\Models\MaintenanceWorkOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompleteMaintenanceWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $workOrder = $this->route('maintenanceWorkOrder');

        return $workOrder instanceof MaintenanceWorkOrder
            && ($this->user()?->can('update', $workOrder) ?? false);
    }

    public function rules(): array
    {
        return [
            'result_condition' => [
                'required',
                Rule::enum(EquipmentCondition::class),
                Rule::notIn([EquipmentCondition::UnderRepair->value]),
            ],
            'completion_notes' => ['required', 'string', 'max:5000'],
            'actual_cost' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'service_provider' => ['nullable', 'string', 'max:255'],
            'recurrence_interval_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
        ];
    }
}
