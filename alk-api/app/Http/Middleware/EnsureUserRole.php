<?php

namespace App\Http\Middleware;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * @param  array<int, string>  $roles
     */
    public function handle(Request $request, \Closure $next, string ...$roles): mixed
    {
        $user = $request->user();

        if (! $user) {
            return $this->unauthorized('Unauthenticated.');
        }

        $userRole = $this->normalizeRole(is_string($user->role) ? $user->role : $user->role?->value);
        $allowedRoles = array_map(fn (string $role): string => $this->normalizeRole($role), $roles);

        if (! in_array($userRole, $allowedRoles, true)) {
            return response()->json(
                ['message' => 'Forbidden: role not allowed for this action.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        return $next($request);
    }

    private function unauthorized(string $message): JsonResponse
    {
        return response()->json(
            ['message' => $message],
            Response::HTTP_UNAUTHORIZED,
        );
    }

    private function normalizeRole(?string $role): string
    {
        $normalized = strtolower(trim((string) $role));

        return $normalized === 'logistic' ? 'logistics' : $normalized;
    }
}
