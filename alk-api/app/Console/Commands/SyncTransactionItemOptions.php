<?php

namespace App\Console\Commands;

use App\Services\Transactions\TransactionItemOptionService;
use Illuminate\Console\Command;

class SyncTransactionItemOptions extends Command
{
    protected $signature = 'transaction-items:sync-options {--path= : Optional absolute or project-relative workbook path}';

    protected $description = 'Sync transaction item dropdown options from the ERP workbook.';

    public function handle(TransactionItemOptionService $service): int
    {
        $path = $this->option('path');
        $resolvedPath = is_string($path) && trim($path) !== ''
            ? $this->resolvePath(trim($path))
            : null;

        $options = $service->sync($resolvedPath);

        foreach ($options as $field => $values) {
            $this->line(sprintf('%s: %d option(s)', $field, count($values)));
        }

        $this->info('Transaction item options synced.');

        return self::SUCCESS;
    }

    private function resolvePath(string $path): string
    {
        if (preg_match('/^[A-Za-z]:[\\\\\\/]/', $path) === 1 || str_starts_with($path, DIRECTORY_SEPARATOR)) {
            return $path;
        }

        return base_path($path);
    }
}
