<?php

namespace App\Http\Requests;

use App\Models\Equipment;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreEquipmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Equipment::class) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'image' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'description' => 'sometimes|nullable|string|max:2000',
            'laboratory_id' => 'required|integer|exists:laboratories,id',
            'category_ids' => 'sometimes|array|max:20',
            'category_ids.*' => 'integer|distinct|exists:categories,id',
            'isActive' => 'sometimes|boolean',
        ];
    }
}
