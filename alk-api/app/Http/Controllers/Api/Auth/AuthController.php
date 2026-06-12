<?php

namespace App\Http\Controllers\Api\Auth;

use App\Contracts\Auth\AuthServiceInterface;
use App\DataTransferObjects\Auth\LoginData;
use App\DataTransferObjects\Auth\RegisterData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\Auth\AuthTokenResource;
use App\Http\Resources\Auth\UserResource;
use App\Services\Audit\UserEventLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

final class AuthController extends Controller
{
    public function __construct(
        private readonly AuthServiceInterface $authService,
        private readonly UserEventLogger $userEventLogger,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register(
            RegisterData::fromArray($request->validated()),
        );

        $this->userEventLogger->log(
            $result->user,
            'Authentication',
            'User registered',
            $result->user->id,
            newValues: $result->user->only(['id', 'name', 'email', 'role', 'is_active']),
            description: "User registered with ID {$result->user->id}",
        );

        return AuthTokenResource::make($result)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * @throws ValidationException
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            LoginData::fromArray($request->validated()),
        );

        if (! $result) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $this->userEventLogger->log(
            $result->user,
            'Authentication',
            'Login',
            $result->user->id,
            newValues: ['email' => $result->user->email],
            description: "User logged in with ID {$result->user->id}",
        );

        return AuthTokenResource::make($result)->response();
    }

    public function me(Request $request): UserResource
    {
        return UserResource::make($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authService->logout($request->user());

        $this->userEventLogger->log(
            $user,
            'Authentication',
            'Logout',
            $user?->id,
            description: "User logged out with ID {$user?->id}",
        );

        return response()->json(
            ['message' => 'Logged out successfully.'],
            Response::HTTP_OK,
        );
    }
}
