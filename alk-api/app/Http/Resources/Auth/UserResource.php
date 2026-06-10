<?php

namespace App\Http\Resources\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'contact_name' => $this->contact_name,
            'phone_number' => $this->phone_number,
            'email' => $this->email,
            'address' => $this->address,
            'is_active' => (bool) $this->is_active,
            'authorization_signature_url' => $this->authorizationUrl($request, $this->authorization_signature_path, 'images/signature.png'),
            'authorization_stamp_url' => $this->authorizationUrl($request, $this->authorization_stamp_path, 'images/stamp.jpg'),
            'role' => $this->role?->value ?? $this->role,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function authorizationUrl(Request $request, ?string $path, string $fallback): string
    {
        $baseUrl = rtrim($request->getSchemeAndHttpHost(), '/');

        if ($path !== null && $path !== '') {
            return $baseUrl . '/storage/' . ltrim($path, '/');
        }

        return $baseUrl . '/' . ltrim($fallback, '/');
    }
}
