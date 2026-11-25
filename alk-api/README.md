# Alkamaris backend

Laravel 12 and PHP 8.2+ API for authentication, transactions, items, reports, users, configuration, documents and mail. The React client is in [`../alk-app`](../alk-app/README.md). See the [status and fields guide](../README-STATUS-FIELDS.md) for transaction rules.

## Local setup

Install PHP 8.2+, Composer and a database supported by Laravel. `.env.example` defaults to SQLite; MySQL settings are included as comments.

```sh
cd alk-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

For SQLite, create `database/database.sqlite` if absent, or set `DB_DATABASE` to an existing SQLite file. Configure database and optional integrations in `.env` before migration. On PowerShell, `Copy-Item .env.example .env` is equivalent to `cp`. Run `php artisan storage:link` when public stored files are needed. Queue jobs need `php artisan queue:work`; scheduled jobs need `php artisan schedule:work` locally or a deployment scheduler.

Composer also provides `composer run setup`, `composer run dev` (API server, queue listener, log viewer and Laravel Vite), and `composer run test`.

## API and code map

Routes are in `routes/api.php`. Authentication is under `/api/auth`. Authenticated users can list, view, create, update and duplicate transactions and access summary reports. User, configuration, item, document, dashboard, mail and history endpoints have additional `admin` or `admin,logistics` role restrictions as defined in the route file. API authentication uses Sanctum.

| Path | Responsibility |
| --- | --- |
| `app/Http/Controllers/Api/` | API request handlers |
| `app/Http/Requests/` | Validation and authorization |
| `app/Http/Resources/` | API response shapes |
| `app/Services/Transactions/TransactionService.php` | Transaction persistence, detail sync and automatic status |
| `app/Services/Transactions/TransactionDocumentService.php` | Document rendering |
| `app/Models/` | Transactions and related records |
| `app/Enums/` | Status and role codes |
| `app/Jobs/`, `app/Console/` | Background jobs, commands and schedule |
| `database/migrations/` | Database schema |
| `resources/views/documents/transactions/` | Document templates |

Transactions have related customer and packer general information, revenue, cash flow and shipping details, plus logistics, notes, items and expenses. `TransactionResource` assembles these records for the client.

`.env.example` includes database, queue, mail, Mailchimp, country lookup and backup recipient settings. The configured schedule dispatches overdue email work on Mondays and Thursdays at 08:00. The LC terms job exists, but its schedule entry is commented out.

## SQL dump history

`php artisan db:dump-sql` creates a full MySQL dump in the `database_sql_dumps` table. Each row has a backup date, start and completion timestamps, status, table and row counts, and either the SQL or an error message. The dump includes the backup table's structure but omits its rows, so prior dumps are not copied into each new dump. Use `--output=path/to/dump.sql` when a local SQL file is also needed.

The Laravel scheduler checks daily at 02:00 and starts the command in the background when the last successful dump is at least two days old. Run `php artisan schedule:run` every minute through the server's task scheduler (or use `php artisan schedule:work` while developing); without a running scheduler, automatic dumps will not start. MySQL InnoDB tables provide a consistent data snapshot; avoid schema changes during a dump.
