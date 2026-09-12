<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEquipmentRequest extends FormRequest
{
    public function authorize()
    {
        return $this->user()?->can('update', $this->route('equipment')) === true;
    }

    public function rules()
    {
        return [
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string|nullable',
            'location' => 'sometimes|string|nullable',
            'image' => [
                'sometimes',
                Rule::when($this->hasFile('image'), ['image', 'mimes:jpeg,png,jpg,webp', 'max:4096'], ['string']),
            ],
            'laboratory_id' => 'sometimes|exists:laboratories,id',
            'category_ids' => 'sometimes|array|max:20',
            'category_ids.*' => 'integer|distinct|exists:categories,id',
            'isActive' => 'sometimes|boolean',
            'remove_image' => 'sometimes|boolean',
        ];
    }
}
