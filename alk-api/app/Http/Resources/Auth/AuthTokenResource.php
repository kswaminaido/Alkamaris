<?php

namespace App\Http\Resources\Auth;

use App\DataTransferObjects\Auth\AuthResultData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuthResultData
 */
final class AuthTokenResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'token_type' => $this->tokenType,
            'access_token' => $this->accessToken,
            'user' => new UserResource($this->user),
        ];
    }
}
