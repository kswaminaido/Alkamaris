<?php

namespace Tests\Feature\Audit;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\UsersEventLog;
use App\Services\Audit\UserEventLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class UserEventLoggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_writes_structured_user_event_logs(): void
    {
        $user = User::factory()->create([
            'name' => 'Audit User',
            'role' => UserRole::Admin,
        ]);

        app(UserEventLogger::class)->log(
            $user,
            'User',
            'User details updated',
            $user->id,
            oldValues: ['role' => UserRole::Sales, 'password' => 'secret'],
            newValues: ['role' => UserRole::Admin, 'password' => 'changed'],
            description: "User details updated with ID {$user->id}",
        );

        $event = UsersEventLog::query()->sole();

        $this->assertSame($user->id, $event->user_id);
        $this->assertSame('Audit User', $event->user_name);
        $this->assertSame('User', $event->event_type);
        $this->assertSame('User details updated', $event->data['action']);
        $this->assertSame($user->id, $event->data['record_id']);
        $this->assertSame(UserRole::Sales->value, $event->data['old_values']['role']);
        $this->assertSame(UserRole::Admin->value, $event->data['new_values']['role']);
        $this->assertSame('[redacted]', $event->data['old_values']['password']);
        $this->assertSame('[redacted]', $event->data['new_values']['password']);
    }
}
