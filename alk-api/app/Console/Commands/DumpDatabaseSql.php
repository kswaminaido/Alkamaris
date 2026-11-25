<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class DumpDatabaseSql extends Command
{
    protected $signature = 'db:dump-sql {--connection= : Source database connection} {--output= : Output SQL file}';

    protected $description = 'Store a complete MySQL SQL dump in database_sql_dumps';

    public function handle(): int
    {
        $connection = DB::connection($this->option('connection') ?: config('database.default'));
        if (! in_array($connection->getDriverName(), ['mysql', 'mariadb'], true)) {
            $this->error('This command supports MySQL and MariaDB connections.');
            return self::FAILURE;
        }

        if (! $connection->getSchemaBuilder()->hasTable('database_sql_dumps')) {
            $this->error('Run the database_sql_dumps migration first.');
            return self::FAILURE;
        }

        $handle = fopen('php://temp', 'w+b');
        if ($handle === false) {
            $this->error('Cannot create SQL dump stream.');
            return self::FAILURE;
        }

        $dumpId = $connection->table('database_sql_dumps')->insertGetId([
            'database_name' => $connection->getDatabaseName(),
            'backup_date' => now()->toDateString(),
            'status' => 'running',
            'started_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $transactionStarted = false;
        $tableCount = 0;
        $rowCount = 0;

        try {
            $connection->statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            $connection->getPdo()->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
            $transactionStarted = true;
            fwrite($handle, "-- MySQL database dump: {$connection->getDatabaseName()}\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");
            $tables = $connection->select('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME', [$connection->getDatabaseName(), 'BASE TABLE']);
            foreach ($tables as $table) {
                $name = $table->TABLE_NAME;
                $tableCount++;
                $quoted = '`'.str_replace('`', '``', $name).'`';
                $create = array_values((array) $connection->selectOne("SHOW CREATE TABLE {$quoted}"))[1];
                fwrite($handle, "DROP TABLE IF EXISTS {$quoted};\n{$create};\n");
                if ($name === 'database_sql_dumps') {
                    fwrite($handle, "\n");
                    continue;
                }
                $binary = array_flip(array_column($connection->select(
                    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND DATA_TYPE IN ('binary','varbinary','blob','tinyblob','mediumblob','longblob','bit')",
                    [$connection->getDatabaseName(), $name]
                ), 'COLUMN_NAME'));
                $offset = 0;
                do {
                    $rows = $connection->select("SELECT * FROM {$quoted} LIMIT 500 OFFSET {$offset}");
                    foreach ($rows as $row) {
                        $values = (array) $row;
                        $columns = implode(', ', array_map(fn ($column) => '`'.str_replace('`', '``', $column).'`', array_keys($values)));
                        $literals = [];
                        foreach ($values as $column => $value) {
                            $literals[] = $value === null ? 'NULL' : (isset($binary[$column]) ? '0x'.bin2hex((string) $value) : $connection->getPdo()->quote((string) $value));
                        }
                        fwrite($handle, "INSERT INTO {$quoted} ({$columns}) VALUES (".implode(', ', $literals).");\n");
                        $offset++;
                        $rowCount++;
                    }
                } while (count($rows) === 500);
                fwrite($handle, "\n");
                $this->line("Exported {$name}: {$offset} rows");
            }
            fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
            $connection->getPdo()->exec('COMMIT');
            $transactionStarted = false;
            rewind($handle);
            $sql = stream_get_contents($handle);
            if ($sql === false) {
                throw new \RuntimeException('Could not read the completed SQL dump.');
            }
            $connection->table('database_sql_dumps')->where('id', $dumpId)->update([
                'sql_dump' => $sql,
                'table_count' => $tableCount,
                'row_count' => $rowCount,
                'status' => 'completed',
                'completed_at' => now(),
                'updated_at' => now(),
            ]);
            if ($this->option('output')) {
                if (file_put_contents($this->option('output'), $sql) === false) {
                    throw new \RuntimeException('Could not write the requested SQL output file.');
                }
            }
            fclose($handle);
            $this->info("SQL dump stored in database_sql_dumps, ID {$dumpId}.");
            return self::SUCCESS;
        } catch (Throwable $e) {
            if ($transactionStarted) {
                $connection->getPdo()->exec('ROLLBACK');
            }
            fclose($handle);
            $connection->table('database_sql_dumps')->where('id', $dumpId)->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
                'updated_at' => now(),
            ]);
            $this->error($e->getMessage());
            return self::FAILURE;
        }
    }
}
