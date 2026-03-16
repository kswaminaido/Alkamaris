<?php

namespace App\Services\Users;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

final class UserService
{
    /**
     * @param  array<string, mixed>  $validated
     */
    public function create(array $validated): User
    {
        return User::query()->create($this->payload($validated, true));
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function update(User $user, array $validated): User
    {
        $user->update($this->payload($validated, false));

        return $user->fresh();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function payload(array $validated, bool $withPassword): array
    {
        $payload = [
            'name' => $validated['name'],
            'phone_number' => $validated['phone_number'],
            'email' => $validated['email'],
            'address' => $validated['address'],
            'registration_number' => $validated['resolved_registration_number'],
            'role' => $validated['user_type'],
        ];

        if ($withPassword || ! empty($validated['password'])) {
            $payload['password'] = Hash::make((string) $validated['password']);
        }

        return $payload;
    }
}
