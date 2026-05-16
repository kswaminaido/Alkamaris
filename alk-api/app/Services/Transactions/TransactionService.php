<?php

namespace App\Services\Transactions;

use App\Models\GeneralInfoCustomer;
use App\Models\GeneralInfoPacker;
use App\Models\RevenueCustomer;
use App\Models\RevenuePacker;
use App\Models\ShippingDetailsCustomer;
use App\Models\ShippingDetailsPacker;
use App\Models\Transaction;
use App\Models\TransactionExpenseLine;
use App\Models\TransactionItem;
use App\Models\TransactionLogistics;
use App\Models\TransactionNote;
use App\Models\TransactionNoteEntry;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class TransactionService
{
    private const BOOKING_PREFIX = 'AME';
    private const BOOKING_SEQUENCE_PAD = 3;

    /**
     * @var array<int, string>
     */
    private const DUPLICATE_FIELDS = [
        'booking_mode',
        'issue_date',
        'sales_person_id',
        'product_origin',
        'destination',
        'category',
        'type',
        'country',
        'container_primary',
        'container_secondary',
        'certified',
        'net_margin',
    ];

    /**
     * @var array<int, string>
     */
    private const ONE_TO_ONE_MODELS = [
        GeneralInfoCustomer::class,
        GeneralInfoPacker::class,
        RevenueCustomer::class,
        RevenuePacker::class,
        ShippingDetailsCustomer::class,
        ShippingDetailsPacker::class,
        TransactionNote::class,
        TransactionLogistics::class,
    ];

    /**
     * @param  array<string, mixed>  $validated
     */
    public function create(array $validated, User $actor): Transaction
    {
        return DB::transaction(function () use ($validated, $actor): Transaction {
            $transaction = Transaction::query()->create([
                ...$this->prepareCreateTransactionPayload($validated['transaction'] ?? [], $actor),
                'created_by_user_id' => $actor->id,
            ]);

            $this->syncDetails($transaction, $validated);

            return $transaction->load(Transaction::detailRelations());
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function update(Transaction $transaction, array $validated): Transaction
    {
        return DB::transaction(function () use ($transaction, $validated): Transaction {
            // If lc_days is provided and changed, set lc_set_at to today
            if (isset($validated['transaction']['lc_days'])) {
                $newLcDays = $validated['transaction']['lc_days'];
                $currentLcDays = $transaction->lc_days ?? null;
                if (($currentLcDays === null || (string) $currentLcDays !== (string) $newLcDays) && $newLcDays !== null && $newLcDays !== '') {
                    $validated['transaction']['lc_set_at'] = CarbonImmutable::now()->toDateString();
                }
            }

            $transaction->update($validated['transaction']);

            $this->syncDetails($transaction, $validated);

            return $transaction->load(Transaction::detailRelations());
        });
    }

    public function duplicate(Transaction $transaction, User $actor): Transaction
    {
        $transaction->load(Transaction::detailRelations());

        return DB::transaction(function () use ($transaction, $actor): Transaction {
            $newTransaction = Transaction::query()->create([
                ...$transaction->only(self::DUPLICATE_FIELDS),
                'booking_no' => $this->generateDuplicateBookingNo((string) $transaction->booking_no),
                'created_by_user_id' => $actor->id,
            ]);

            $this->cloneOneToOneRelations($transaction, $newTransaction);
            $this->cloneMany($transaction->expenseLines, TransactionExpenseLine::class, $newTransaction->id);
            $this->cloneMany($transaction->noteEntries, TransactionNoteEntry::class, $newTransaction->id);
            $this->cloneMany($transaction->items, TransactionItem::class, $newTransaction->id);

            return $newTransaction->load(Transaction::detailRelations());
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncDetails(Transaction $transaction, array $validated): void
    {
        $this->syncOneToOneRelations($transaction->id, $validated);

        if (array_key_exists('expense_lines', $validated)) {
            $this->replaceExpenseLines($transaction->id, $validated['expense_lines'] ?? []);
        }

        if (array_key_exists('note_entries', $validated)) {
            $this->replaceNoteEntries($transaction->id, $validated['note_entries'] ?? []);
        }

        if (array_key_exists('items', $validated)) {
            $this->replaceItems($transaction->id, $validated['items'] ?? []);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncOneToOneRelations(int $transactionId, array $validated): void
    {
        foreach ($this->oneToOnePayloads($validated) as $modelClass => $payload) {
            $this->upsertOneToOne($transactionId, $modelClass, $payload);
        }
    }

    private function cloneOneToOneRelations(Transaction $source, Transaction $target): void
    {
        foreach ($this->oneToOneSources($source) as $modelClass => $record) {
            $this->cloneOneToOne($record, $modelClass, $target->id);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, array<string, mixed>>
     */
    private function oneToOnePayloads(array $validated): array
    {
        return [
            GeneralInfoCustomer::class => $validated['general_info_customer'] ?? [],
            GeneralInfoPacker::class => $validated['general_info_packer'] ?? [],
            RevenueCustomer::class => $validated['revenue_customer'] ?? [],
            RevenuePacker::class => $validated['revenue_packer'] ?? [],
            ShippingDetailsCustomer::class => $validated['shipping_details_customer'] ?? [],
            ShippingDetailsPacker::class => $validated['shipping_details_packer'] ?? [],
            TransactionNote::class => $validated['notes'] ?? [],
            TransactionLogistics::class => $validated['logistics'] ?? [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function oneToOneSources(Transaction $transaction): array
    {
        return [
            GeneralInfoCustomer::class => $transaction->generalInfoCustomer,
            GeneralInfoPacker::class => $transaction->generalInfoPacker,
            RevenueCustomer::class => $transaction->revenueCustomer,
            RevenuePacker::class => $transaction->revenuePacker,
            ShippingDetailsCustomer::class => $transaction->shippingDetailsCustomer,
            ShippingDetailsPacker::class => $transaction->shippingDetailsPacker,
            TransactionNote::class => $transaction->note,
            TransactionLogistics::class => $transaction->logistics,
        ];
    }

    private function generateDuplicateBookingNo(string $sourceBookingNo): string
    {
        $base = trim($sourceBookingNo) !== '' ? $sourceBookingNo : 'TRX';
        $suffix = 1;

        do {
            $candidate = "{$base}-D{$suffix}";
            $exists = Transaction::query()->where('booking_no', $candidate)->exists();
            $suffix++;
        } while ($exists);

        return $candidate;
    }

    /**
     * @param  array<string, mixed>  $transactionData
     * @return array<string, mixed>
     */
    private function prepareCreateTransactionPayload(array $transactionData, User $actor): array
    {
        $issueDate = CarbonImmutable::now()->toDateString();
        $requestedBookingNo = trim((string) ($transactionData['booking_no'] ?? ''));
        $productOrigin = trim((string) ($transactionData['product_origin'] ?? ''));
        $bookingNo = $this->resolveCreateBookingNo($requestedBookingNo, $issueDate);

        return [
            ...$transactionData,
            'booking_no' => $bookingNo,
            'issue_date' => $issueDate,
            'sales_person_id' => $transactionData['sales_person_id'] ?? $actor->id,
            'product_origin' => $productOrigin !== '' ? $productOrigin : 'India (Singapore)',
        ];
    }

    private function resolveCreateBookingNo(string $requestedBookingNo, string $issueDate): string
    {
        if ($requestedBookingNo !== '') {
            $exists = Transaction::query()->where('booking_no', $requestedBookingNo)->exists();

            if (! $exists) {
                return $requestedBookingNo;
            }
        }

        return $this->generateBookingNo($issueDate);
    }

    private function generateBookingNo(string $issueDate): string
    {
        $prefix = self::BOOKING_PREFIX.$this->financialYearSuffix($issueDate);
        $nextTransactionId = ((int) Transaction::query()->max('id')) + 1;

        do {
            $candidate = $prefix.str_pad((string) $nextTransactionId, self::BOOKING_SEQUENCE_PAD, '0', STR_PAD_LEFT);
            $nextTransactionId++;
        } while (Transaction::query()->where('booking_no', $candidate)->exists());

        return $candidate;
    }

    private function financialYearSuffix(string $issueDate): string
    {
        $date = CarbonImmutable::parse($issueDate);
        $financialYear = $date->month >= 4 ? $date->year : $date->year - 1;

        return substr((string) $financialYear, -2);
    }

    private function cloneOneToOne(mixed $sourceRecord, string $modelClass, int $newTransactionId): void
    {
        if (! $sourceRecord) {
            $modelClass::query()->create(['transaction_id' => $newTransactionId]);

            return;
        }

        $payload = $sourceRecord->toArray();
        unset($payload['id'], $payload['transaction_id'], $payload['created_at'], $payload['updated_at']);
        $payload['transaction_id'] = $newTransactionId;
        $modelClass::query()->create($payload);
    }

    private function cloneMany(mixed $records, string $modelClass, int $newTransactionId): void
    {
        foreach ($records ?? [] as $record) {
            $payload = $record->toArray();
            unset($payload['id'], $payload['transaction_id'], $payload['created_at'], $payload['updated_at']);
            $payload['transaction_id'] = $newTransactionId;
            $modelClass::query()->create($payload);
        }
    }

    private function upsertOneToOne(int $transactionId, string $modelClass, array $payload): void
    {
        // If updating logistics, capture previous bl_date to detect transition from null -> date
        $previousBlDate = null;
        if ($modelClass === TransactionLogistics::class) {
            $previous = $modelClass::query()->where('transaction_id', $transactionId)->first();
            $previousBlDate = $previous?->bl_date ?? null;
        }

        $modelClass::query()->updateOrCreate(
            ['transaction_id' => $transactionId],
            $payload,
        );

        // After upsert, if logistics bl_date changed from null to a date, update transaction status to Received (R)
        if ($modelClass === TransactionLogistics::class) {
            $current = $modelClass::query()->where('transaction_id', $transactionId)->first();
            $currentBlDate = $current?->bl_date ?? null;

            if ($previousBlDate === null && $currentBlDate !== null) {
                Transaction::query()->where('id', $transactionId)->update(['status' => \App\Enums\TransactionStatus::Received->value]);
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     */
    private function replaceExpenseLines(int $transactionId, array $lines): void
    {
        TransactionExpenseLine::query()->where('transaction_id', $transactionId)->delete();

        foreach ($lines as $index => $line) {
            TransactionExpenseLine::query()->create([
                'transaction_id' => $transactionId,
                'section' => (string) ($line['section'] ?? ''),
                'group_name' => $line['group_name'] ?? null,
                'line_key' => (string) ($line['line_key'] ?? ''),
                'line_label' => $line['line_label'] ?? null,
                'amount' => $line['amount'] ?? null,
                'currency' => $line['currency'] ?? null,
                'description' => $line['description'] ?? null,
                'sort_order' => (int) ($line['sort_order'] ?? $index),
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $entries
     */
    private function replaceNoteEntries(int $transactionId, array $entries): void
    {
        TransactionNoteEntry::query()->where('transaction_id', $transactionId)->delete();

        foreach ($entries as $index => $entry) {
            TransactionNoteEntry::query()->create([
                'transaction_id' => $transactionId,
                'section' => $entry['section'] ?? null,
                'note_key' => (string) ($entry['note_key'] ?? ''),
                'note_value' => $entry['note_value'] ?? null,
                'sort_order' => (int) ($entry['sort_order'] ?? $index),
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function replaceItems(int $transactionId, array $items): void
    {
        TransactionItem::query()->where('transaction_id', $transactionId)->delete();

        foreach ($items as $index => $item) {
            TransactionItem::query()->create([
                'transaction_id' => $transactionId,
                ...$item,
                'sort_order' => (int) ($item['sort_order'] ?? $index),
            ]);
        }
    }
}
