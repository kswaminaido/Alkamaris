<?php

namespace App\Http\Requests\Users;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class UserUpsertRequest extends FormRequest
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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->route('user');
        $isUpdate = $user instanceof User;

        return [
            'name' => [$isUpdate ? 'nullable' : 'required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone_number' => [$isUpdate ? 'nullable' : 'required', 'string', 'max:20'],
            'email' => [$isUpdate ? 'nullable' : 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'address' => [$isUpdate ? 'nullable' : 'required', 'string', 'max:1000'],
            'user_type' => [$isUpdate ? 'nullable' : 'required', 'string', Rule::in($this->allowedRoles($user))],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function allowedRoles(?User $user): array
    {
        return array_values(array_unique(array_filter([
            ...UserRole::values(),
            is_string($user?->role) ? $user?->role : $user?->role?->value,
        ])));
    }
}
