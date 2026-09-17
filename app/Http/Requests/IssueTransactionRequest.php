<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class IssueTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('process', $this->route('transaction')) ?? false;
    }

    public function rules(): array
    {
        return [
            'unit_ids' => ['required', 'array', 'min:1', 'max:100'],
            'unit_ids.*' => ['required', 'string', 'max:2048', 'distinct'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
