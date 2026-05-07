<?php

namespace App\Console;

use App\Jobs\ProcessLcTermsJob;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Register the commands for the application.
     */
    protected function commands()
    {
        // Load the default commands if present
        if (file_exists(app_path('Console/Commands'))) {
            $this->load(app_path('Console/Commands'));
        }
    }

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Dispatch the LC terms processing job once daily
        $schedule->call(function () {
            ProcessLcTermsJob::dispatch();
        })->daily();
    }
}
