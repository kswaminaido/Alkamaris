<?php

namespace App\DataTransferObjects\Auth;

use App\Models\User;

final readonly class AuthResultData
{
    public function __construct(
        public User $user,
        public string $accessToken,
        public string $tokenType = 'Bearer',
    ) {}
}
