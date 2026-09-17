<?php

namespace App\Http\Requests;

use App\Models\MaintenanceWorkOrder;
use Illuminate\Foundation\Http\FormRequest;

class CancelMaintenanceWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $workOrder = $this->route('maintenanceWorkOrder');

        return $workOrder instanceof MaintenanceWorkOrder
            && ($this->user()?->can('update', $workOrder) ?? false);
    }

    public function rules(): array
    {
        return ['reason' => ['required', 'string', 'max:2000']];
    }
}
