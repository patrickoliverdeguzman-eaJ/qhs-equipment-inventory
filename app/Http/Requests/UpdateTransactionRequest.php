<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $transaction = $this->route('transaction');

        return $transaction && $this->user()?->can('update', $transaction);
    }

    public function rules(): array
    {
        if ($this->route('transaction')?->status !== 'pending') {
            return [
                'notes' => ['nullable', 'string', 'max:2000'],
                'return_date' => ['nullable', 'date'],
            ];
        }

        $selfService = $this->user()?->role === 'user';

        return [
            'borrower_id' => $selfService
                ? ['exclude']
                : ['required', 'integer', 'exists:users,id'],
            'borrower_name' => $selfService
                ? ['exclude']
                : ['required', 'string', 'max:255'],
            'borrower_email' => $selfService ? ['exclude'] : ['nullable', 'email', 'max:255'],
            'borrower_contact' => $selfService ? ['exclude'] : ['nullable', 'string', 'max:50'],
            'laboratory_id' => ['required', 'integer', 'exists:laboratories,id'],
            'borrow_date' => ['required', 'date'],
            'return_date' => ['nullable', 'date', 'after_or_equal:borrow_date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'equipment' => ['required', 'array', 'min:1', 'max:50'],
            'equipment.*.equipment_id' => ['required', 'integer', 'distinct', 'exists:equipment,id'],
            'equipment.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }
}
