<?php

use App\Http\Middleware\EnsureUserRole;
use App\Http\Middleware\PreventSearchIndexing;
use App\Jobs\OverdueEmailJob;
use App\Jobs\ProcessLcTermsJob;
use App\Jobs\SendHiMailJob;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('database:backup-mail')
            ->mondays()
            ->at('08:00')
            ->withoutOverlapping();

        $schedule->job(new ProcessLcTermsJob)
            ->daily()
            ->withoutOverlapping();

        $schedule->job(new OverdueEmailJob)
            ->mondays()
            ->at('08:00')
            ->withoutOverlapping();

        $schedule->job(new OverdueEmailJob)
            ->thursdays()
            ->at('08:00')
            ->withoutOverlapping();

        // $schedule->job(new SendHiMailJob)
        //     ->everyMinute()
        //     ->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(PreventSearchIndexing::class);

        $middleware->alias([
            'role' => EnsureUserRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
