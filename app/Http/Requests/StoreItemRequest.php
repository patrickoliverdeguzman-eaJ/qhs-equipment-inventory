<?php

namespace App\Http\Requests;

use App\Models\Equipment;
use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $equipment = Equipment::find($this->integer('equipment_id'));

        return $equipment && $this->user()?->can('manageItems', $equipment);
    }

    public function rules(): array
    {
        return [
            'equipment_id' => 'required|integer|exists:equipment,id',
            'condition' => 'sometimes|in:New,Good,Fair,Poor,Damaged,Missing,Under Repair',
            'isBorrowed' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'equipment_id.exists' => 'The selected equipment does not exist.',
            'condition.in' => 'Select a supported equipment condition.',
        ];
    }
}
