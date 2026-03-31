<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:20'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'address' => ['required', 'string', 'max:1000'],
            'registration_number' => ['required', 'string', 'max:100', Rule::unique('users', 'registration_number')->ignore($user?->id)],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function validatedWithRegistrationNumber(): array
    {
        $validated = $this->validated();
        $validated['resolved_registration_number'] = $validated['registration_number'];

        return $validated;
    }
}
