<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Config;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => User::query()->orderByDesc('id')->get(),
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => $user]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateUserPayload($request);

        $user = User::query()->create([
            'name' => $validated['name'],
            'phone_number' => $validated['phone_number'],
            'email' => $validated['email'],
            'address' => $validated['address'],
            'registration_number' => $validated['registration_number'],
            'role' => $validated['user_type'],
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json(['data' => $user], Response::HTTP_CREATED);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $this->validateUserPayload($request, $user);

        $updatePayload = [
            'name' => $validated['name'],
            'phone_number' => $validated['phone_number'],
            'email' => $validated['email'],
            'address' => $validated['address'],
            'registration_number' => $validated['registration_number'],
            'role' => $validated['user_type'],
        ];

        if (! empty($validated['password'])) {
            $updatePayload['password'] = Hash::make($validated['password']);
        }

        $user->update($updatePayload);

        return response()->json(['data' => $user->fresh()]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(
            ['message' => 'User deleted successfully.'],
            Response::HTTP_OK,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validateUserPayload(Request $request, ?User $user = null): array
    {
        $allowedRoles = array_values(
            array_intersect(
                Config::optionsByType('roles'),
                UserRole::values(),
            ),
        );

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:20'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'address' => ['required', 'string', 'max:1000'],
            'registration_number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('users', 'registration_number')->ignore($user?->id),
            ],
            'user_type' => ['required', 'string', Rule::in($allowedRoles)],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
        ]);
    }
}
