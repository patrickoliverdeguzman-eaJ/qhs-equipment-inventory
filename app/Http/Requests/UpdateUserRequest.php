<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $target = $this->route('user');

        return [
            'name' => 'sometimes|string|max:255',
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users')->ignore($target),
            ],
            'role' => 'sometimes|in:admin,custodian,user',
            'isActive' => 'sometimes|boolean',
            'avatar' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'password' => [
                'sometimes',
                Password::min(8)->letters()->numbers(),
            ],
        ];
    }
}
