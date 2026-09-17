<?php

namespace App\Http\Requests;

use App\Enums\EquipmentCondition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReturnTransactionItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('process', $this->route('transaction')) ?? false;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.unit_id' => ['required', 'string', 'max:2048', 'distinct'],
            'items.*.condition' => ['required', Rule::enum(EquipmentCondition::class)],
            'items.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                foreach ($this->input('items', []) as $index => $item) {
                    if (
                        in_array($item['condition'] ?? null, EquipmentCondition::unavailableValues(), true)
                        && blank($item['notes'] ?? null)
                    ) {
                        $validator->errors()->add(
                            "items.{$index}.notes",
                            'Notes are required when an item is damaged, missing, or under repair.',
                        );
                    }
                }
            },
        ];
    }
}
