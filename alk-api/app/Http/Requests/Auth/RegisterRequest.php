<?php

namespace App\Http\Requests\Auth;

use App\Enums\UserRole;
use App\Models\Config;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string|Password>>
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
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->resolveRegistrationNumber() !== null) {
                    return;
                }

                $validator->errors()->add(
                    $this->identifierField(),
                    sprintf('%s is required.', $this->identifierLabel()),
                );
            },
        ];
    }

    private function resolveRegistrationNumber(): ?string
    {
        $registrationNumber = $this->filled('registration_number')
            ? trim((string) $this->input('registration_number'))
            : null;

        return match ($this->input('user_type')) {
            UserRole::Customer->value => $this->filled('firm_number')
                ? trim((string) $this->input('firm_number'))
                : $registrationNumber,
            UserRole::Sales->value => $this->filled('factory_approval_number')
                ? trim((string) $this->input('factory_approval_number'))
                : $registrationNumber,
            default => $registrationNumber,
        };
    }

    private function identifierField(): string
    {
        return match ($this->input('user_type')) {
            UserRole::Customer->value => 'firm_number',
            UserRole::Sales->value => 'factory_approval_number',
            default => 'registration_number',
        };
    }

    private function identifierLabel(): string
    {
        return match ($this->input('user_type')) {
            UserRole::Customer->value => 'Firm Number',
            UserRole::Sales->value => 'Factory Approval Number',
            default => 'Registration Number',
        };
    }
}
