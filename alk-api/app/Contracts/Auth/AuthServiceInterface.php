<?php

namespace App\Contracts\Auth;

use App\DataTransferObjects\Auth\AuthResultData;
use App\DataTransferObjects\Auth\LoginData;
use App\DataTransferObjects\Auth\RegisterData;
use App\Models\User;

interface AuthServiceInterface
{
    public function register(RegisterData $data): AuthResultData;

    public function login(LoginData $data): ?AuthResultData;

    public function logout(User $user): void;
}
