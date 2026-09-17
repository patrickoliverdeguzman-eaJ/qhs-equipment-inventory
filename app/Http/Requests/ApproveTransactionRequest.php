<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ApproveTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('process', $this->route('transaction')) ?? false;
    }

    public function rules(): array
    {
        return [
            'return_date' => [
                Rule::requiredIf(fn () => blank($this->route('transaction')?->return_date)),
                'nullable',
                'date',
                'after_or_equal:today',
            ],
        ];
    }
}
