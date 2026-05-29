<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\Auth\UserResource;
use App\Services\Users\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

final class ProfileController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->userService->update(
            $request->user(),
            $request->validatedWithRegistrationNumber(),
        );

        return response()->json([
            'message' => 'Profile updated successfully.',
            'data' => UserResource::make($user)->resolve(),
        ], Response::HTTP_OK);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $this->userService->update($request->user(), [
            'password' => $request->validated('password'),
        ]);

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
