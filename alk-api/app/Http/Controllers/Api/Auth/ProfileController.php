<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\Auth\UserResource;
use App\Services\Users\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

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
}
