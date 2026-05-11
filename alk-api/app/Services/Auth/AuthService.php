<?php

namespace App\Services\Auth;

use App\Contracts\Auth\AuthServiceInterface;
use App\DataTransferObjects\Auth\AuthResultData;
use App\DataTransferObjects\Auth\LoginData;
use App\DataTransferObjects\Auth\RegisterData;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class AuthService implements AuthServiceInterface
{
    public function register(RegisterData $data): AuthResultData
    {
        $user = DB::transaction(
            fn (): User => User::query()->create([
                'name' => $data->name,
                'phone_number' => $data->phoneNumber,
                'email' => $data->email,
                'address' => $data->address,
                'registration_number' => $data->registrationNumber,
                'role' => $data->userType,
                'is_active' => false,
                'password' => $data->password,
            ]),
        );

        return $this->issueToken($user);
    }

    public function login(LoginData $data): ?AuthResultData
    {
        /** @var User|null $user */
        $user = User::query()
            ->where('email', $data->email)
            ->first();

        if (! $user || ! Hash::check($data->password, $user->password) || ! $user->is_active) {
            return null;
        }

        return $this->issueToken($user);
    }

    public function logout(User $user): void
    {
        $currentToken = $user->currentAccessToken();

        if ($currentToken) {
            $currentToken->delete();

            return;
        }

        $user->tokens()->delete();
    }

    private function issueToken(User $user): AuthResultData
    {
        $accessToken = $user->createToken('auth_token')->plainTextToken;

        return new AuthResultData(
            user: $user,
            accessToken: $accessToken,
        );
    }
}
