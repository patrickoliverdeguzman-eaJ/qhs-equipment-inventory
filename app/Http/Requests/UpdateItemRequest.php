<?php

namespace App\Http\Requests;

use App\Models\EquipmentItem;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $item = $this->route('item');

        if (! $item instanceof EquipmentItem) {
            $item = EquipmentItem::with('equipment')->find($item);
        }

        return $item && $this->user()?->can('manageItems', $item->equipment);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'equipment_id' => ['prohibited'],
            'condition' => 'sometimes|in:New,Good,Fair,Poor,Damaged,Missing,Under Repair',
            'isBorrowed' => ['prohibited'],
        ];
    }
}
