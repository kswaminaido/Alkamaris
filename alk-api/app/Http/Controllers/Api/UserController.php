<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Http\Resources\Auth\UserResource;
use App\Models\User;
use App\Services\Audit\UserEventLogger;
use App\Services\Users\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
        private readonly UserEventLogger $userEventLogger,
    ) {}

    public function index(): JsonResponse
    {
        $perPage = (int) request()->integer('per_page', 20);
        $perPage = max(5, min($perPage, 100));

        $query = User::query();

        if ($name = request('name')) {
            $query->where('name', 'like', "%{$name}%");
        }

        $roles = request('roles') ? explode(',', request('roles')) : [];
        if (!empty($roles)) {
            $query->whereIn('role', $roles);
        } elseif ($role = request('role')) {
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
            'data' => UserResource::collection($paginator->items())->resolve(),
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
        return response()->json(['data' => UserResource::make($user)->resolve()]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());

        $this->userEventLogger->log(
            $request->user(),
            'User',
            'User created',
            $user->id,
            newValues: $user->only(['id', 'name', 'email', 'role', 'is_active']),
            description: "User created with ID {$user->id}",
        );

        return response()->json(['data' => UserResource::make($user)->resolve()], Response::HTTP_CREATED);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $oldValues = $user->only(['name', 'contact_name', 'phone_number', 'email', 'address', 'role', 'is_active']);
        $updated = $this->userService->update($user, $request->validated());
        $action = array_key_exists('is_active', $request->validated())
            && (bool) ($oldValues['is_active'] ?? false) !== (bool) $updated->is_active
                ? ((bool) $updated->is_active ? 'Record activated' : 'Record deactivated')
                : 'User details updated';

        $this->userEventLogger->log(
            $request->user(),
            'User',
            $action,
            $updated->id,
            oldValues: $oldValues,
            newValues: $updated->only(['name', 'contact_name', 'phone_number', 'email', 'address', 'role', 'is_active']),
            description: "{$action} with ID {$updated->id}",
        );

        return response()->json([
            'data' => UserResource::make($updated)->resolve(),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $oldValues = $user->only(['id', 'name', 'email', 'role', 'is_active']);
        $user->delete();

        $this->userEventLogger->log(
            request()->user(),
            'User',
            'User deleted',
            $user->id,
            oldValues: $oldValues,
            description: "User deleted with ID {$user->id}",
        );

        return response()->json(
            ['message' => 'User deleted successfully.'],
            Response::HTTP_OK,
        );
    }
}
