<?php

namespace App\Services\Audit;

use App\Models\User;
use App\Models\UsersEventLog;
use BackedEnum;
use Illuminate\Support\Arr;
use UnitEnum;
use Throwable;

final class UserEventLogger
{
    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     * @param  array<string, mixed>  $context
     */
    public function log(
        ?User $user,
        string $eventType,
        string $action,
        int|string|null $recordId = null,
        array $oldValues = [],
        array $newValues = [],
        ?string $description = null,
        array $context = [],
    ): ?UsersEventLog {
        if (! $user) {
            return null;
        }

        try {
            return UsersEventLog::query()->create([
                'user_id' => $user->id,
                'user_name' => (string) $user->name,
                'event_type' => $eventType,
                'data' => [
                    'event_type' => $eventType,
                    'action' => $action,
                    'record_id' => $recordId,
                    'description' => $description ?? $this->description($action, $recordId),
                    'old_values' => $this->sanitize($oldValues),
                    'new_values' => $this->sanitize($newValues),
                    ...$this->sanitize($context),
                ],
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }

    private function description(string $action, int|string|null $recordId): string
    {
        if ($recordId === null || $recordId === '') {
            return $action;
        }

        return "{$action} with ID {$recordId}";
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function sanitize(array $values): array
    {
        return collect($values)
            ->mapWithKeys(function (mixed $value, string|int $key): array {
                $key = (string) $key;

                if ($this->isSensitiveKey($key)) {
                    return [$key => '[redacted]'];
                }

                if (is_array($value)) {
                    return [$key => $this->sanitize($value)];
                }

                if ($value instanceof BackedEnum) {
                    return [$key => $value->value];
                }

                if ($value instanceof UnitEnum) {
                    return [$key => $value->name];
                }

                return [$key => $value];
            })
            ->all();
    }

    private function isSensitiveKey(string $key): bool
    {
        return Arr::first(
            ['password', 'token', 'secret', 'authorization'],
            static fn (string $sensitive): bool => str_contains(strtolower($key), $sensitive),
        ) !== null;
    }
}
