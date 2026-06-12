<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\Auth\UserResource;
use App\Services\Audit\UserEventLogger;
use App\Services\Users\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

final class ProfileController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
        private readonly UserEventLogger $userEventLogger,
    ) {}

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $oldValues = $request->user()->only(['name', 'contact_name', 'phone_number', 'email', 'address']);
        $user = $this->userService->update(
            $request->user(),
            $request->validated(),
        );

        $this->userEventLogger->log(
            $user,
            'Profile',
            'Profile updated',
            $user->id,
            oldValues: $oldValues,
            newValues: $user->only(['name', 'contact_name', 'phone_number', 'email', 'address']),
            description: "Profile updated with ID {$user->id}",
        );

        return response()->json([
            'message' => 'Profile updated successfully.',
            'data' => UserResource::make($user)->resolve(),
        ], Response::HTTP_OK);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $this->userService->update($request->user(), [
            'password' => $request->validated('password'),
        ]);

        $this->userEventLogger->log(
            $user,
            'Authentication',
            'Password changed',
            $user->id,
            description: "Password changed with ID {$user->id}",
        );

        return response()->json([
            'message' => 'Password updated successfully.',
        ], Response::HTTP_OK);
    }

    public function updateAuthorization(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'signature_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'stamp_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ]);

        $user = $request->user();
        $oldValues = $user->only(['authorization_signature_path', 'authorization_stamp_path']);
        $payload = [];

        if ($request->hasFile('signature_image')) {
            $this->deleteAuthorizationImage($user->authorization_signature_path);
            $payload['authorization_signature_path'] = $request
                ->file('signature_image')
                ->store("authorizations/{$user->id}", 'public');
        }

        if ($request->hasFile('stamp_image')) {
            $this->deleteAuthorizationImage($user->authorization_stamp_path);
            $payload['authorization_stamp_path'] = $request
                ->file('stamp_image')
                ->store("authorizations/{$user->id}", 'public');
        }

        if ($payload !== []) {
            $user->update($payload);
            $user = $user->fresh();
        }

        $this->userEventLogger->log(
            $user,
            'Profile',
            'Authorization images updated',
            $user->id,
            oldValues: $oldValues,
            newValues: $user->only(['authorization_signature_path', 'authorization_stamp_path']),
            description: "Authorization images updated with ID {$user->id}",
        );

        return response()->json([
            'message' => 'Authorization images updated successfully.',
            'data' => UserResource::make($user)->resolve(),
        ], Response::HTTP_OK);
    }

    private function deleteAuthorizationImage(?string $path): void
    {
        if ($path !== null && $path !== '') {
            Storage::disk('public')->delete($path);
        }
    }
}
