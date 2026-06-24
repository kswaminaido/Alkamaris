<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UsersEventLog;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

class AdminHistoryController extends Controller
{
    public function index(): JsonResponse
    {
        $perPage = (int) request()->integer('per_page', 20);
        $perPage = max(5, min($perPage, 100));

        $paginator = UsersEventLog::query()
            ->with('user:id,name,email')
            ->where('created_at', '>=', CarbonImmutable::now()->subDays(5))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        $events = $paginator
            ->getCollection()
            ->map(static fn (UsersEventLog $event): array => [
                'id' => $event->id,
                'user_id' => $event->user?->id ?? $event->user_id,
                'user_name' => $event->user?->name ?? $event->user_name,
                'user_email' => $event->user?->email,
                'event_type' => $event->event_type,
                'action' => $event->data['action'] ?? $event->event_type,
                'description' => $event->data['description'] ?? $event->data['action'] ?? $event->event_type,
                'created_at' => optional($event->created_at)->toJSON(),
            ]);

        return response()->json([
            'data' => $events,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
