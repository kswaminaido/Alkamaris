<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use App\Services\Users\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function index(): JsonResponse
    {
        $perPage = (int) request()->integer('per_page', 20);
        $perPage = max(5, min($perPage, 100));

        $query = User::query();

        if ($name = request('name')) {
            $query->where('name', 'like', "%{$name}%");
        }

        if ($role = request('role')) {
            $query->where('role', $role);
        }

        if ($fromDate = request('from_date')) {
            $query->whereDate('created_at', '>=', $fromDate);
        }

        if ($toDate = request('to_date')) {
            $query->whereDate('created_at', '<=', $toDate);
        }

        $paginator = $query
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => $user]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validatedWithRegistrationNumber());

        return response()->json(['data' => $user], Response::HTTP_CREATED);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        return response()->json([
            'data' => $this->userService->update($user, $request->validatedWithRegistrationNumber()),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(
            ['message' => 'User deleted successfully.'],
            Response::HTTP_OK,
        );
    }
}
