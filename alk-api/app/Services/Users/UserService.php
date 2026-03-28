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
        $payload = [];

        if (isset($validated['name'])) {
            $payload['name'] = $validated['name'];
        }
        if (isset($validated['phone_number'])) {
            $payload['phone_number'] = $validated['phone_number'];
        }
        if (isset($validated['email'])) {
            $payload['email'] = $validated['email'];
        }
        if (isset($validated['address'])) {
            $payload['address'] = $validated['address'];
        }
        if (isset($validated['resolved_registration_number'])) {
            $payload['registration_number'] = $validated['resolved_registration_number'];
        }
        if (isset($validated['user_type'])) {
            $payload['role'] = $validated['user_type'];
        }

        if ($withPassword && isset($validated['password']) && ! empty($validated['password'])) {
            $payload['password'] = Hash::make((string) $validated['password']);
        } elseif (! $withPassword && isset($validated['password']) && ! empty($validated['password'])) {
            $payload['password'] = Hash::make((string) $validated['password']);
        }

        if (isset($validated['is_active'])) {
            $payload['is_active'] = $validated['is_active'];
        }

        return $payload;
    }
}
