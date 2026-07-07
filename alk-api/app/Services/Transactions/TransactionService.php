<?php

namespace App\Services\Transactions;

use App\Enums\TransactionStatus;
use App\Models\CashFlowCustomer;
use App\Models\CashFlowPacker;
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

    private const BOOKING_SEQUENCE_START = 301;

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
        CashFlowCustomer::class,
        CashFlowPacker::class,
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

            return $transaction->refresh()->load(Transaction::detailRelations());
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
            $transaction->touch();

            return $transaction->refresh()->load(Transaction::detailRelations());
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
            $this->refreshRevenueDerivedFields($transaction->id);
        }
    }

    public function refreshRevenueDerivedFields(Transaction|int $transaction): void
    {
        $transactionId = $transaction instanceof Transaction ? $transaction->id : $transaction;
        $items = $this->revenueSourceItems($transactionId, []);
        $totals = $this->revenueTotals($items);

        RevenueCustomer::query()->updateOrCreate(
            ['transaction_id' => $transactionId],
            [
                'total_selling_value' => $totals['total_customer_commission'],
                'amount' => $totals['total_selling_price'],
                'commission_enabled' => $totals['has_customer_commission'],
            ],
        );

        RevenuePacker::query()->updateOrCreate(
            ['transaction_id' => $transactionId],
            [
                'total_buying_value' => $totals['total_packer_commission'],
                'amount' => $totals['total_selling_price'],
                'commission_enabled' => $totals['has_packer_commission'],
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncOneToOneRelations(int $transactionId, array $validated): void
    {
        foreach ($this->oneToOnePayloads($transactionId, $validated) as $modelClass => $payload) {
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
    private function oneToOnePayloads(int $transactionId, array $validated): array
    {
        $validated = $this->applyRevenueDerivedFields($transactionId, $validated);

        return [
            GeneralInfoCustomer::class => $validated['general_info_customer'] ?? [],
            GeneralInfoPacker::class => $validated['general_info_packer'] ?? [],
            RevenueCustomer::class => $validated['revenue_customer'] ?? [],
            RevenuePacker::class => $validated['revenue_packer'] ?? [],
            CashFlowCustomer::class => $validated['cash_flow_customer'] ?? [],
            CashFlowPacker::class => $validated['cash_flow_packer'] ?? [],
            ShippingDetailsCustomer::class => $validated['shipping_details_customer'] ?? [],
            ShippingDetailsPacker::class => $validated['shipping_details_packer'] ?? [],
            TransactionNote::class => $validated['notes'] ?? [],
            TransactionLogistics::class => $validated['logistics'] ?? [],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function applyRevenueDerivedFields(int $transactionId, array $validated): array
    {
        $items = $this->revenueSourceItems($transactionId, $validated);

        if ($items === []) {
            return $validated;
        }

        $totals = $this->revenueTotals($items);

        $validated['revenue_customer'] = $validated['revenue_customer'] ?? [];
        $validated['revenue_packer'] = $validated['revenue_packer'] ?? [];

        if (! array_key_exists('total_selling_value', $validated['revenue_customer'])) {
            $validated['revenue_customer']['total_selling_value'] = $totals['total_customer_commission'];
        }

        if (! array_key_exists('amount', $validated['revenue_customer'])) {
            $validated['revenue_customer']['amount'] = $totals['total_selling_price'];
        }

        if (! array_key_exists('total_buying_value', $validated['revenue_packer'])) {
            $validated['revenue_packer']['total_buying_value'] = $totals['total_packer_commission'];
        }

        if (! array_key_exists('amount', $validated['revenue_packer'])) {
            $validated['revenue_packer']['amount'] = $totals['total_selling_price'];
        }

        $validated['revenue_customer']['commission_enabled'] = $totals['has_customer_commission']
            ? true
            : (bool) ($validated['revenue_customer']['commission_enabled'] ?? false);

        $validated['revenue_packer']['commission_enabled'] = $totals['has_packer_commission']
            ? true
            : (bool) ($validated['revenue_packer']['commission_enabled'] ?? false);

        return $validated;
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{total_selling_price: float, total_packer_commission: float, total_customer_commission: float, has_packer_commission: bool, has_customer_commission: bool}
     */
    private function revenueTotals(array $items): array
    {
        return [
            'total_selling_price' => array_sum(array_map(
                fn (array $item): float => (float) ($item['selling_total'] ?? 0),
                $items,
            )),
            'total_packer_commission' => array_sum(array_map(
                fn (array $item): float => (float) ($item['total_packer_commission'] ?? 0),
                $items,
            )),
            'total_customer_commission' => array_sum(array_map(
                fn (array $item): float => (float) ($item['total_customer_commission'] ?? 0),
                $items,
            )),
            'has_packer_commission' => collect($items)->contains(
                fn (array $item): bool => (float) ($item['commission_from_packer'] ?? 0) !== 0.0,
            ),
            'has_customer_commission' => collect($items)->contains(
                fn (array $item): bool => (float) ($item['commission_from_customer'] ?? 0) !== 0.0,
            ),
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<int, array<string, mixed>>
     */
    private function revenueSourceItems(int $transactionId, array $validated): array
    {
        if (array_key_exists('items', $validated)) {
            $itemService = app(TransactionItemService::class);

            return array_map(
                fn (array $item): array => $itemService->applyDerivedTotals($item),
                $validated['items'] ?? [],
            );
        }

        return TransactionItem::query()
            ->where('transaction_id', $transactionId)
            ->get()
            ->map(fn (TransactionItem $item): array => $item->toArray())
            ->all();
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
            CashFlowCustomer::class => $transaction->cashFlowCustomer,
            CashFlowPacker::class => $transaction->cashFlowPacker,
            ShippingDetailsCustomer::class => $transaction->shippingDetailsCustomer,
            ShippingDetailsPacker::class => $transaction->shippingDetailsPacker,
            TransactionNote::class => $transaction->note,
            TransactionLogistics::class => $transaction->logistics,
        ];
    }

    private function generateDuplicateBookingNo(string $sourceBookingNo): string
    {
        $sourceBookingNo = trim($sourceBookingNo);

        if ($sourceBookingNo === '') {
            return $this->generateBookingNo(CarbonImmutable::now()->toDateString());
        }

        if (preg_match('/^(?<base>.+?)-D\d+$/', $sourceBookingNo, $matches)) {
            $sourceBookingNo = $matches['base'];
        }

        $prefix = preg_replace('/\d+$/', '', $sourceBookingNo);
        $sequenceText = substr($sourceBookingNo, strlen($prefix));

        if ($prefix === '' || $sequenceText === '' || ! ctype_digit($sequenceText)) {
            return $this->generateBookingNo(CarbonImmutable::now()->toDateString());
        }

        $sequenceLength = max(strlen($sequenceText), self::BOOKING_SEQUENCE_PAD);
        $nextSequence = max(
            self::BOOKING_SEQUENCE_START,
            $this->maxBookingSequence(
                Transaction::query()->where('booking_no', 'like', $prefix.'%')->pluck('booking_no'),
                $prefix,
            ) + 1,
        );

        do {
            $candidate = $prefix.str_pad((string) $nextSequence, $sequenceLength, '0', STR_PAD_LEFT);
            $nextSequence++;
        } while (Transaction::query()->where('booking_no', $candidate)->exists());

        return $candidate;
    }

    /**
     * @param  array<string, mixed>  $transactionData
     * @return array<string, mixed>
     */
    private function prepareCreateTransactionPayload(array $transactionData, User $actor): array
    {
        $issueDate = $this->normalizeIssueDate($transactionData['issue_date'] ?? null);
        $requestedBookingNo = trim((string) ($transactionData['booking_no'] ?? ''));
        $productOrigin = trim((string) ($transactionData['product_origin'] ?? ''));
        $bookingNo = $this->resolveCreateBookingNo($requestedBookingNo, $issueDate);

        return [
            ...$transactionData,
            'booking_no' => $bookingNo,
            'issue_date' => $issueDate,
            'sales_person_id' => $transactionData['sales_person_id'] ?? $actor->id,
            'product_origin' => $productOrigin !== '' ? $productOrigin : null,
        ];
    }

    private function normalizeIssueDate(mixed $issueDate): string
    {
        $dateText = trim((string) ($issueDate ?? ''));

        if ($dateText === '') {
            return CarbonImmutable::now()->toDateString();
        }

        return CarbonImmutable::parse($dateText)->toDateString();
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
        $bookingNumbers = Transaction::query()
            ->where('booking_no', 'like', $prefix.'%')
            ->pluck('booking_no');
        $nextSequence = max(self::BOOKING_SEQUENCE_START, $this->maxBookingSequence($bookingNumbers, $prefix) + 1);

        do {
            $candidate = $prefix.str_pad((string) $nextSequence, self::BOOKING_SEQUENCE_PAD, '0', STR_PAD_LEFT);
            $nextSequence++;
        } while (Transaction::query()->where('booking_no', $candidate)->exists());

        return $candidate;
    }

    /**
     * @param  iterable<int, string>  $bookingNumbers
     */
    private function maxBookingSequence(iterable $bookingNumbers, string $prefix): int
    {
        $max = 0;

        foreach ($bookingNumbers as $bookingNo) {
            $suffix = substr((string) $bookingNo, strlen($prefix));

            if ($suffix !== '' && ctype_digit($suffix)) {
                $max = max($max, (int) $suffix);
            }
        }

        return $max;
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
        $modelClass::query()->updateOrCreate(
            ['transaction_id' => $transactionId],
            $payload,
        );

        $this->syncTransactionStatus($transactionId);
    }

    private function syncTransactionStatus(int $transactionId): void
    {
        $logistics = TransactionLogistics::query()->where('transaction_id', $transactionId)->first();
        $cashFlowPacker = CashFlowPacker::query()->where('transaction_id', $transactionId)->first();

        $status = TransactionStatus::Unshipped;

        if ($cashFlowPacker?->date_balance !== null) {
            $status = TransactionStatus::Paid;
        } elseif ($cashFlowPacker?->invoice_date !== null) {
            $status = TransactionStatus::Invoice;
        } elseif ($logistics?->packer_inv_date !== null) {
            $status = TransactionStatus::Received;
        } elseif ($logistics?->bl_date !== null) {
            $status = TransactionStatus::Shipped;
        }

        Transaction::query()
            ->where('id', $transactionId)
            ->update(['status' => $status->value]);
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
        $itemService = app(TransactionItemService::class);

        foreach ($items as $index => $item) {
            TransactionItem::query()->create([
                'transaction_id' => $transactionId,
                ...$itemService->applyDerivedTotals($item),
                'sort_order' => (int) ($item['sort_order'] ?? $index),
            ]);
        }
    }
}
