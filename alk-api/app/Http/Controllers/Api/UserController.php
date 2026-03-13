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
use Illuminate\Support\Facades\Validator;
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
            'registration_number' => $validated['resolved_registration_number'],
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
            'registration_number' => $validated['resolved_registration_number'],
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
        $allowedRoles = array_values(array_unique(array_filter([
            ...array_intersect(
                Config::optionsByType('roles'),
                UserRole::values(),
            ),
            is_string($user?->role) ? $user?->role : $user?->role?->value,
        ])));

        $validator = Validator::make($request->all(), [
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
            'registration_number' => ['nullable', 'string', 'max:100', Rule::unique('users', 'registration_number')->ignore($user?->id)],
            'firm_number' => ['nullable', 'string', 'max:100', Rule::unique('users', 'registration_number')->ignore($user?->id)],
            'factory_approval_number' => ['nullable', 'string', 'max:100', Rule::unique('users', 'registration_number')->ignore($user?->id)],
            'user_type' => ['required', 'string', Rule::in($allowedRoles)],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
        ]);

        $validator->after(function (\Illuminate\Validation\Validator $validator) use ($request): void {
            if ($this->resolveRegistrationNumber($request->all()) !== null) {
                return;
            }

            $validator->errors()->add(
                $this->identifierField((string) $request->input('user_type')),
                sprintf('%s is required.', $this->identifierLabel((string) $request->input('user_type'))),
            );
        });

        $validated = $validator->validate();
        $validated['resolved_registration_number'] = $this->resolveRegistrationNumber($validated);

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveRegistrationNumber(array $payload): ?string
    {
        $registrationNumber = $this->filledValue($payload['registration_number'] ?? null);

        return match ($payload['user_type'] ?? null) {
            UserRole::Customer->value => $this->filledValue($payload['firm_number'] ?? null) ?? $registrationNumber,
            UserRole::Sales->value => $this->filledValue($payload['factory_approval_number'] ?? null) ?? $registrationNumber,
            default => $registrationNumber,
        };
    }

    private function identifierField(string $userType): string
    {
        return match ($userType) {
            UserRole::Customer->value => 'firm_number',
            UserRole::Sales->value => 'factory_approval_number',
            default => 'registration_number',
        };
    }

    private function identifierLabel(string $userType): string
    {
        return match ($userType) {
            UserRole::Customer->value => 'Firm Number',
            UserRole::Sales->value => 'Factory Approval Number',
            default => 'Registration Number',
        };
    }

    private function filledValue(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
