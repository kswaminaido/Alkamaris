<?php

namespace App\Jobs;

use App\Enums\TransactionStatus;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

final class ProcessLcTermsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $today = Carbon::now()->toDateString();

        $transactions = Transaction::query()
            ->where('status', TransactionStatus::Received)
            ->whereNotNull('lc_set_at')
            ->whereRaw("DATE_ADD(lc_set_at, INTERVAL lc_days DAY) = ?", [$today])
            ->get();

        foreach ($transactions as $transaction) {
            $transaction->status = TransactionStatus::Invoice;
            $transaction->save();
        }
    }
}
