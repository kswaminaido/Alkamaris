<?php

namespace App\Http\Requests\Auth;

use App\Enums\UserRole;
use App\Models\Config;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class RegisterRequest extends FormRequest
{
    /**
     * @var array<int, string>
     */
    private const PASSWORD_REQUIRED_USER_TYPES = [
        UserRole::Admin->value,
        UserRole::Logistics->value,
        UserRole::Accounts->value,
        UserRole::Sales->value,
    ];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('user_type')) {
            $this->merge([
                'user_type' => strtolower(trim((string) $this->input('user_type'))),
            ]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $allowedUserTypes = array_values(
            array_intersect(
                Config::optionsByType('roles'),
                UserRole::registrableValues(),
            ),
        );

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:20'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'address' => ['required', 'string', 'max:1000'],
            'user_type' => ['required', 'string', Rule::in($allowedUserTypes)],
            'registration_number' => ['nullable', 'string', 'max:100', 'unique:users,registration_number'],
            'firm_number' => ['nullable', 'string', 'max:100', 'unique:users,registration_number'],
            'factory_approval_number' => ['nullable', 'string', 'max:100', 'unique:users,registration_number'],
            'password' => [
                Rule::requiredIf(fn (): bool => in_array($this->input('user_type'), self::PASSWORD_REQUIRED_USER_TYPES, true)),
                'nullable',
                'string',
                'min:8',
                'confirmed',
            ],
            'password_confirmation' => [
                Rule::requiredIf(fn (): bool => in_array($this->input('user_type'), self::PASSWORD_REQUIRED_USER_TYPES, true)),
                'nullable',
                'string',
                'min:8',
            ],
        ];
    }
}
