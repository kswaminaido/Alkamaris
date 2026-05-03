<?php

namespace App\Http\Requests\Auth;

use App\Enums\UserRole;
use App\Models\Config;
use App\Support\Users\UserRegistrationNumberResolver;
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

    protected function prepareForValidation(): void
    {
        if ($this->has('user_type')) {
            $this->merge([
                'user_type' => strtolower(trim((string) $this->input('user_type'))),
            ]);
        }
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
                if (UserRegistrationNumberResolver::resolve($this->all()) !== null) {
                    return;
                }

                $userType = (string) $this->input('user_type');

                $validator->errors()->add(
                    UserRegistrationNumberResolver::identifierField($userType),
                    sprintf('%s is required.', UserRegistrationNumberResolver::identifierLabel($userType)),
                );
            },
        ];
    }
}
