<?php

namespace App\Console\Commands;

use App\Services\Mail\MailchimpCampaignMailer;
use Illuminate\Console\Command;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

class BackupDatabaseAndMail extends Command
{
    protected $signature = 'database:backup-mail {--keep : Keep the backup file after it is emailed}';

    protected $description = 'Back up the configured database and email it to SEND_BACKUP_TO recipients.';

    public function handle(MailchimpCampaignMailer $mailchimp): int
    {
        $recipients = config('services.backup.emails', []);

        if (empty($recipients)) {
            $this->error('No backup recipients configured. Set SEND_BACKUP_TO in .env.');

            return self::FAILURE;
        }

        if (! $mailchimp->isConfigured()) {
            $this->error('Mailchimp is not configured. Set MAILCHIMP_API_KEY before sending database backups.');

            return self::FAILURE;
        }

        $connectionName = config('database.default');
        $connection = DB::connection($connectionName);
        $driver = $connection->getDriverName();

        if (! in_array($driver, ['mysql', 'sqlite'], true)) {
            $this->error("Database backup is not supported for the [{$driver}] driver.");

            return self::FAILURE;
        }

        $directory = storage_path('app/backups');
        File::ensureDirectoryExists($directory);

        $timestamp = now()->format('Ymd_His');
        $databaseName = $this->databaseName($connection, $connectionName);
        $filename = "{$databaseName}_backup_{$timestamp}.sql";
        $path = $directory.DIRECTORY_SEPARATOR.$filename;

        try {
            $this->writeDump($connection, $driver, $path);
            $result = $this->mailBackup($mailchimp, $recipients, $path, $filename);
        } catch (Throwable $exception) {
            $this->error('Database backup email failed: '.$exception->getMessage());

            return self::FAILURE;
        } finally {
            if (! $this->option('keep') && File::exists($path)) {
                File::delete($path);
            }
        }

        $this->info('Database backup emailed through Mailchimp to: '.implode(', ', $recipients));
        $this->line('Mailchimp campaign ID: '.$result['campaign_id']);

        return self::SUCCESS;
    }

    private function writeDump(Connection $connection, string $driver, string $path): void
    {
        $handle = fopen($path, 'wb');

        if ($handle === false) {
            throw new \RuntimeException("Unable to create backup file at {$path}.");
        }

        try {
            $this->writeLine($handle, '-- Alkamaris database backup');
            $this->writeLine($handle, '-- Generated at: '.now()->toDateTimeString());
            $this->writeLine($handle, '-- Connection: '.$connection->getName());
            $this->writeLine($handle);

            if ($driver === 'mysql') {
                $this->writeMysqlDump($connection, $handle);
            } else {
                $this->writeSqliteDump($connection, $handle);
            }
        } finally {
            fclose($handle);
        }
    }

    private function writeMysqlDump(Connection $connection, mixed $handle): void
    {
        $this->writeLine($handle, 'SET FOREIGN_KEY_CHECKS=0;');
        $this->writeLine($handle);

        foreach ($this->mysqlTables($connection) as $table) {
            $quotedTable = $this->quoteIdentifier($table);
            $createRows = $connection->select("SHOW CREATE TABLE {$quotedTable}");
            $createValues = array_values((array) $createRows[0]);
            $createSql = $createValues[1] ?? null;

            if (! is_string($createSql) || $createSql === '') {
                continue;
            }

            $this->writeLine($handle, "DROP TABLE IF EXISTS {$quotedTable};");
            $this->writeLine($handle, $createSql.';');
            $this->writeRows($connection, $handle, $table);
            $this->writeLine($handle);
        }

        $this->writeLine($handle, 'SET FOREIGN_KEY_CHECKS=1;');
    }

    private function writeSqliteDump(Connection $connection, mixed $handle): void
    {
        $this->writeLine($handle, 'PRAGMA foreign_keys=OFF;');
        $this->writeLine($handle, 'BEGIN TRANSACTION;');
        $this->writeLine($handle);

        $tables = $connection->select(
            "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );

        foreach ($tables as $table) {
            $name = $table->name;
            $quotedTable = $this->quoteIdentifier($name);

            $this->writeLine($handle, "DROP TABLE IF EXISTS {$quotedTable};");
            $this->writeLine($handle, rtrim($table->sql, ';').';');
            $this->writeRows($connection, $handle, $name);
            $this->writeLine($handle);
        }

        $this->writeLine($handle, 'COMMIT;');
        $this->writeLine($handle, 'PRAGMA foreign_keys=ON;');
    }

    /**
     * @return array<int, string>
     */
    private function mysqlTables(Connection $connection): array
    {
        return collect($connection->select('SHOW FULL TABLES'))
            ->filter(function (object $row): bool {
                $values = array_values((array) $row);

                return ($values[1] ?? null) === 'BASE TABLE';
            })
            ->map(function (object $row): string {
                $values = array_values((array) $row);

                return (string) $values[0];
            })
            ->values()
            ->all();
    }

    private function writeRows(Connection $connection, mixed $handle, string $table): void
    {
        $quotedTable = $this->quoteIdentifier($table);

        foreach ($connection->table($table)->cursor() as $row) {
            $columns = array_keys((array) $row);
            $values = array_map(
                fn (mixed $value): string => $this->quoteValue($connection, $value),
                array_values((array) $row)
            );

            $this->writeLine(
                $handle,
                sprintf(
                    'INSERT INTO %s (%s) VALUES (%s);',
                    $quotedTable,
                    implode(', ', array_map(fn (string $column): string => $this->quoteIdentifier($column), $columns)),
                    implode(', ', $values)
                )
            );
        }
    }

    /**
     * @return array{campaign_id: string, recipient_count: int}
     */
    private function mailBackup(MailchimpCampaignMailer $mailchimp, array $recipients, string $path, string $filename): array
    {
        $subject = config('app.name').' database backup - '.now()->format('Y-m-d H:i:s');
        $mailchimpFilename = $filename.'.txt';
        $uploadedFile = $mailchimp->uploadFile($mailchimpFilename, (string) file_get_contents($path));
        $generatedAt = now()->toDateTimeString();
        $html = <<<HTML
<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;">
    <h2>Database Backup</h2>
    <p>The latest database backup was generated at {$generatedAt}.</p>
    <p><a href="{$uploadedFile['url']}">Download {$mailchimpFilename}</a></p>
    <p>The file contains SQL backup data. Rename it from .sql.txt to .sql before restoring if needed.</p>
</div>
HTML;

        return $mailchimp->sendCampaign(
            $recipients,
            $subject,
            $html,
            'Database Backup '.$generatedAt,
        );
    }

    private function quoteIdentifier(string $identifier): string
    {
        return '`'.str_replace('`', '``', $identifier).'`';
    }

    private function quoteValue(Connection $connection, mixed $value): string
    {
        if ($value === null) {
            return 'NULL';
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        $quoted = $connection->getPdo()->quote((string) $value);

        if ($quoted === false) {
            return "'".str_replace("'", "''", (string) $value)."'";
        }

        return $quoted;
    }

    private function writeLine(mixed $handle, string $line = ''): void
    {
        fwrite($handle, $line.PHP_EOL);
    }

    private function databaseName(Connection $connection, string $fallback): string
    {
        $database = $connection->getDatabaseName() ?: $fallback;
        $name = pathinfo($database, PATHINFO_FILENAME) ?: $database;

        return preg_replace('/[^A-Za-z0-9_-]+/', '_', $name) ?: 'database';
    }
}
