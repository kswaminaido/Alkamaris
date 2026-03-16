<?php

namespace App\Http\Requests\Users;

use App\Enums\UserRole;
use App\Models\Config;
use App\Models\User;
use App\Support\Users\UserRegistrationNumberResolver;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

abstract class UserUpsertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:20'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'address' => ['required', 'string', 'max:1000'],
            'registration_number' => ['nullable', 'string', 'max:100', Rule::unique('users', 'registration_number')->ignore($user?->id)],
            'firm_number' => ['nullable', 'string', 'max:100', Rule::unique('users', 'registration_number')->ignore($user?->id)],
            'factory_approval_number' => ['nullable', 'string', 'max:100', Rule::unique('users', 'registration_number')->ignore($user?->id)],
            'user_type' => ['required', 'string', Rule::in($this->allowedRoles($user))],
            'password' => [$user instanceof User ? 'nullable' : 'required', 'string', 'min:8'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $resolved = UserRegistrationNumberResolver::resolve($this->all());

                if ($resolved !== null) {
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

    /**
     * @return array<string, mixed>
     */
    public function validatedWithRegistrationNumber(): array
    {
        $validated = $this->validated();
        $validated['resolved_registration_number'] = UserRegistrationNumberResolver::resolve($validated);

        return $validated;
    }

    /**
     * @return array<int, string>
     */
    private function allowedRoles(?User $user): array
    {
        return array_values(array_unique(array_filter([
            ...array_intersect(
                Config::optionsByType('roles'),
                UserRole::values(),
            ),
            is_string($user?->role) ? $user?->role : $user?->role?->value,
        ])));
    }
}
