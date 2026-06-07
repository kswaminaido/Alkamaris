<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
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

        $userRole = $user->role instanceof UserRole
            ? $user->role->value
            : UserRole::fromValue($user->role)?->value;
        $allowedRoles = UserRole::queryValuesFromCsv(implode(',', $roles));

        if ($userRole === null || ! in_array($userRole, $allowedRoles, true)) {
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
}
