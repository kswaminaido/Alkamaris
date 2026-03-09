<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
use App\Models\TransactionLogistics;
use App\Models\TransactionNote;
use App\Models\TransactionNoteEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TransactionController extends Controller
{
    public function index(): JsonResponse
    {
        $perPage = (int) request()->integer('per_page', 20);
        $perPage = max(5, min($perPage, 100));

        $paginator = Transaction::query()
            ->with($this->relations())
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(Transaction $transaction): JsonResponse
    {
        $transaction->load($this->relations());

        return response()->json(['data' => $transaction]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $transaction = DB::transaction(function () use ($validated, $request): Transaction {
            $transaction = Transaction::query()->create([
                ...$validated['transaction'],
                'created_by_user_id' => $request->user()->id,
            ]);

            $this->upsertOneToOne($transaction->id, GeneralInfoCustomer::class, $validated['general_info_customer'] ?? []);
            $this->upsertOneToOne($transaction->id, GeneralInfoPacker::class, $validated['general_info_packer'] ?? []);
            $this->upsertOneToOne($transaction->id, RevenueCustomer::class, $validated['revenue_customer'] ?? []);
            $this->upsertOneToOne($transaction->id, RevenuePacker::class, $validated['revenue_packer'] ?? []);
            $this->upsertOneToOne($transaction->id, CashFlowCustomer::class, $validated['cash_flow_customer'] ?? []);
            $this->upsertOneToOne($transaction->id, CashFlowPacker::class, $validated['cash_flow_packer'] ?? []);
            $this->upsertOneToOne($transaction->id, ShippingDetailsCustomer::class, $validated['shipping_details_customer'] ?? []);
            $this->upsertOneToOne($transaction->id, ShippingDetailsPacker::class, $validated['shipping_details_packer'] ?? []);
            $this->upsertOneToOne($transaction->id, TransactionNote::class, $validated['notes'] ?? []);
            $this->upsertOneToOne($transaction->id, TransactionLogistics::class, $validated['logistics'] ?? []);
            $this->replaceExpenseLines($transaction->id, $validated['expense_lines'] ?? []);
            $this->replaceNoteEntries($transaction->id, $validated['note_entries'] ?? []);

            return $transaction->load($this->relations());
        });

        return response()->json(['data' => $transaction], Response::HTTP_CREATED);
    }

    public function update(Request $request, Transaction $transaction): JsonResponse
    {
        $validated = $this->validatePayload($request, $transaction);

        $updated = DB::transaction(function () use ($validated, $transaction): Transaction {
            $transaction->update($validated['transaction']);

            $this->upsertOneToOne($transaction->id, GeneralInfoCustomer::class, $validated['general_info_customer'] ?? []);
            $this->upsertOneToOne($transaction->id, GeneralInfoPacker::class, $validated['general_info_packer'] ?? []);
            $this->upsertOneToOne($transaction->id, RevenueCustomer::class, $validated['revenue_customer'] ?? []);
            $this->upsertOneToOne($transaction->id, RevenuePacker::class, $validated['revenue_packer'] ?? []);
            $this->upsertOneToOne($transaction->id, CashFlowCustomer::class, $validated['cash_flow_customer'] ?? []);
            $this->upsertOneToOne($transaction->id, CashFlowPacker::class, $validated['cash_flow_packer'] ?? []);
            $this->upsertOneToOne($transaction->id, ShippingDetailsCustomer::class, $validated['shipping_details_customer'] ?? []);
            $this->upsertOneToOne($transaction->id, ShippingDetailsPacker::class, $validated['shipping_details_packer'] ?? []);
            $this->upsertOneToOne($transaction->id, TransactionNote::class, $validated['notes'] ?? []);
            $this->upsertOneToOne($transaction->id, TransactionLogistics::class, $validated['logistics'] ?? []);
            $this->replaceExpenseLines($transaction->id, $validated['expense_lines'] ?? []);
            $this->replaceNoteEntries($transaction->id, $validated['note_entries'] ?? []);

            return $transaction->load($this->relations());
        });

        return response()->json(['data' => $updated]);
    }

    public function duplicate(Request $request, Transaction $transaction): JsonResponse
    {
        $transaction->load($this->relations());

        $duplicate = DB::transaction(function () use ($request, $transaction): Transaction {
            $newTransaction = Transaction::query()->create([
                ...$transaction->only([
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
                ]),
                'booking_no' => $this->generateDuplicateBookingNo((string) $transaction->booking_no),
                'created_by_user_id' => $request->user()->id,
            ]);

            $this->cloneOneToOne($transaction->generalInfoCustomer, GeneralInfoCustomer::class, $newTransaction->id);
            $this->cloneOneToOne($transaction->generalInfoPacker, GeneralInfoPacker::class, $newTransaction->id);
            $this->cloneOneToOne($transaction->revenueCustomer, RevenueCustomer::class, $newTransaction->id);
            $this->cloneOneToOne($transaction->revenuePacker, RevenuePacker::class, $newTransaction->id);
            $this->cloneOneToOne($transaction->cashFlowCustomer, CashFlowCustomer::class, $newTransaction->id);
            $this->cloneOneToOne($transaction->cashFlowPacker, CashFlowPacker::class, $newTransaction->id);
            $this->cloneOneToOne($transaction->shippingDetailsCustomer, ShippingDetailsCustomer::class, $newTransaction->id);
            $this->cloneOneToOne($transaction->shippingDetailsPacker, ShippingDetailsPacker::class, $newTransaction->id);
            $this->cloneOneToOne($transaction->note, TransactionNote::class, $newTransaction->id);
            $this->cloneOneToOne($transaction->logistics, TransactionLogistics::class, $newTransaction->id);
            $this->cloneMany($transaction->expenseLines, TransactionExpenseLine::class, $newTransaction->id);
            $this->cloneMany($transaction->noteEntries, TransactionNoteEntry::class, $newTransaction->id);

            return $newTransaction->load($this->relations());
        });

        return response()->json(
            ['data' => $duplicate, 'message' => 'Transaction duplicated successfully.'],
            Response::HTTP_CREATED,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request, ?Transaction $transaction = null): array
    {
        $bookingNoRule = Rule::unique('transactions', 'booking_no');
        if ($transaction) {
            $bookingNoRule = $bookingNoRule->ignore($transaction->id);
        }

        return $request->validate([
            'transaction' => ['required', 'array'],
            'transaction.booking_no' => ['required', 'string', 'max:100', $bookingNoRule],
            'transaction.booking_mode' => ['required', 'string', Rule::in(['trade_commission', 'qc_services'])],
            'transaction.issue_date' => ['nullable', 'date'],
            'transaction.sales_person_id' => ['nullable', 'integer', 'exists:users,id'],
            'transaction.product_origin' => ['nullable', 'string', 'max:255'],
            'transaction.destination' => ['nullable', 'string', 'max:255'],
            'transaction.category' => ['nullable', 'string', 'max:255'],
            'transaction.type' => ['nullable', 'string', 'max:255'],
            'transaction.country' => ['nullable', 'string', 'max:255'],
            'transaction.container_primary' => ['nullable', 'string', 'max:255'],
            'transaction.container_secondary' => ['nullable', 'string', 'max:255'],
            'transaction.certified' => ['nullable', 'boolean'],
            'transaction.net_margin' => ['nullable', 'numeric'],

            'general_info_customer' => ['nullable', 'array'],
            'general_info_customer.customer' => ['nullable', 'string', 'max:255'],
            'general_info_customer.attention' => ['nullable', 'string', 'max:255'],
            'general_info_customer.ship_to' => ['nullable', 'string', 'max:255'],
            'general_info_customer.buyer' => ['nullable', 'string', 'max:255'],
            'general_info_customer.buyer_number' => ['nullable', 'string', 'max:255'],
            'general_info_customer.end_customer' => ['nullable', 'string', 'max:255'],
            'general_info_customer.prices_customer_type' => ['nullable', 'string', 'max:255'],
            'general_info_customer.prices_customer_rate' => ['nullable', 'numeric'],
            'general_info_customer.payment_customer_term' => ['nullable', 'string', 'max:255'],
            'general_info_customer.payment_customer_type' => ['nullable', 'string', 'max:255'],
            'general_info_customer.payment_customer_advance_percent' => ['nullable', 'numeric'],
            'general_info_customer.description' => ['nullable', 'string'],
            'general_info_customer.tolerance' => ['nullable', 'string', 'max:255'],
            'general_info_customer.marketing_fee' => ['nullable', 'boolean'],

            'general_info_packer' => ['nullable', 'array'],
            'general_info_packer.vendor' => ['nullable', 'string', 'max:255'],
            'general_info_packer.packer_name' => ['nullable', 'string', 'max:255'],
            'general_info_packer.packer_number' => ['nullable', 'string', 'max:255'],
            'general_info_packer.packed_by' => ['nullable', 'string', 'max:255'],
            'general_info_packer.prices_packer_type' => ['nullable', 'string', 'max:255'],
            'general_info_packer.prices_packer_rate' => ['nullable', 'numeric'],
            'general_info_packer.payment_packer_term' => ['nullable', 'string', 'max:255'],
            'general_info_packer.payment_packer_type' => ['nullable', 'string', 'max:255'],
            'general_info_packer.payment_packer_advance_percent' => ['nullable', 'numeric'],
            'general_info_packer.description' => ['nullable', 'string'],
            'general_info_packer.tolerance' => ['nullable', 'string', 'max:255'],
            'general_info_packer.total_lqd_price' => ['nullable', 'numeric'],
            'general_info_packer.consignee' => ['nullable', 'string', 'max:255'],

            'revenue_customer' => ['nullable', 'array'],
            'revenue_customer.total_selling_value' => ['nullable', 'numeric'],
            'revenue_customer.total_selling_currency' => ['nullable', 'string', 'max:50'],
            'revenue_customer.commission_enabled' => ['nullable', 'boolean'],
            'revenue_customer.commission_percent' => ['nullable', 'numeric'],
            'revenue_customer.amount' => ['nullable', 'numeric'],
            'revenue_customer.amount_currency' => ['nullable', 'string', 'max:50'],
            'revenue_customer.description' => ['nullable', 'string'],
            'revenue_customer.rebate_memo_amount' => ['nullable', 'numeric'],
            'revenue_customer.rebate_memo_description' => ['nullable', 'string', 'max:255'],
            'revenue_customer.overcharge_sc_amount' => ['nullable', 'numeric'],
            'revenue_customer.overcharge_sc_description' => ['nullable', 'string', 'max:255'],

            'revenue_packer' => ['nullable', 'array'],
            'revenue_packer.total_buying_value' => ['nullable', 'numeric'],
            'revenue_packer.total_buying_currency' => ['nullable', 'string', 'max:50'],
            'revenue_packer.commission_enabled' => ['nullable', 'boolean'],
            'revenue_packer.commission_percent' => ['nullable', 'numeric'],
            'revenue_packer.amount' => ['nullable', 'numeric'],
            'revenue_packer.amount_currency' => ['nullable', 'string', 'max:50'],
            'revenue_packer.description' => ['nullable', 'string'],
            'revenue_packer.overcharge_sc_amount' => ['nullable', 'numeric'],
            'revenue_packer.overcharge_sc_description' => ['nullable', 'string', 'max:255'],

            'cash_flow_customer' => ['nullable', 'array'],
            'cash_flow_customer.date_advance' => ['nullable', 'date'],
            'cash_flow_customer.amount_advance' => ['nullable', 'numeric'],
            'cash_flow_customer.date_balance' => ['nullable', 'date'],
            'cash_flow_customer.amount_balance' => ['nullable', 'numeric'],

            'cash_flow_packer' => ['nullable', 'array'],
            'cash_flow_packer.date_advance' => ['nullable', 'date'],
            'cash_flow_packer.amount_advance' => ['nullable', 'numeric'],
            'cash_flow_packer.date_balance' => ['nullable', 'date'],
            'cash_flow_packer.amount_balance' => ['nullable', 'numeric'],

            'shipping_details_customer' => ['nullable', 'array'],
            'shipping_details_customer.lsd_min' => ['nullable', 'date'],
            'shipping_details_customer.lsd_max' => ['nullable', 'date'],
            'shipping_details_customer.presentation_days' => ['nullable', 'integer'],
            'shipping_details_customer.lc_expiry' => ['nullable', 'date'],
            'shipping_details_customer.req_eta' => ['nullable', 'date'],

            'shipping_details_packer' => ['nullable', 'array'],
            'shipping_details_packer.lsd_min' => ['nullable', 'date'],
            'shipping_details_packer.lsd_max' => ['nullable', 'date'],
            'shipping_details_packer.presentation_days' => ['nullable', 'integer'],
            'shipping_details_packer.lc_expiry' => ['nullable', 'date'],
            'shipping_details_packer.req_eta' => ['nullable', 'date'],

            'notes' => ['nullable', 'array'],
            'notes.by_sales' => ['nullable', 'string'],

            'logistics' => ['nullable', 'array'],
            'logistics.plan_etd' => ['nullable', 'date'],
            'logistics.plan_eta' => ['nullable', 'date'],
            'logistics.packaging_date_inner' => ['nullable', 'date'],
            'logistics.packaging_date_outer' => ['nullable', 'date'],
            'logistics.feeder_vessel' => ['nullable', 'string', 'max:255'],
            'logistics.mother_vessel' => ['nullable', 'string', 'max:255'],
            'logistics.container_no' => ['nullable', 'string', 'max:255'],
            'logistics.seal_no' => ['nullable', 'string', 'max:255'],
            'logistics.lc_no' => ['nullable', 'string', 'max:255'],
            'logistics.temperature_recorder_no' => ['nullable', 'string', 'max:255'],
            'logistics.etd_date' => ['nullable', 'date'],
            'logistics.eta_date' => ['nullable', 'date'],
            'logistics.qc_inspection_date' => ['nullable', 'date'],
            'logistics.discharge_at' => ['nullable', 'string', 'max:255'],
            'logistics.service_type' => ['nullable', 'string', 'max:255'],
            'logistics.bl_date' => ['nullable', 'date'],
            'logistics.bl_no' => ['nullable', 'string', 'max:255'],
            'logistics.port' => ['nullable', 'string', 'max:255'],
            'logistics.destination' => ['nullable', 'string', 'max:255'],
            'logistics.shipping_line_agent' => ['nullable', 'string', 'max:255'],
            'logistics.packer_inv_date' => ['nullable', 'date'],
            'logistics.packer_inv' => ['nullable', 'string', 'max:255'],
            'logistics.cancel_claim' => ['nullable', 'boolean'],
            'logistics.cancel_reject' => ['nullable', 'boolean'],
            'logistics.cancel_move' => ['nullable', 'boolean'],

            'expense_lines' => ['nullable', 'array'],
            'expense_lines.*.section' => ['required_with:expense_lines', 'string', 'max:50'],
            'expense_lines.*.group_name' => ['nullable', 'string', 'max:100'],
            'expense_lines.*.line_key' => ['required_with:expense_lines', 'string', 'max:100'],
            'expense_lines.*.line_label' => ['nullable', 'string', 'max:120'],
            'expense_lines.*.amount' => ['nullable', 'numeric'],
            'expense_lines.*.currency' => ['nullable', 'string', 'max:50'],
            'expense_lines.*.description' => ['nullable', 'string', 'max:255'],
            'expense_lines.*.sort_order' => ['nullable', 'integer', 'min:0'],

            'note_entries' => ['nullable', 'array'],
            'note_entries.*.section' => ['nullable', 'string', 'max:50'],
            'note_entries.*.note_key' => ['required_with:note_entries', 'string', 'max:100'],
            'note_entries.*.note_value' => ['nullable', 'string'],
            'note_entries.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return [
            'salesPerson:id,name,email',
            'createdBy:id,name,email',
            'generalInfoCustomer',
            'generalInfoPacker',
            'revenueCustomer',
            'revenuePacker',
            'cashFlowCustomer',
            'cashFlowPacker',
            'shippingDetailsCustomer',
            'shippingDetailsPacker',
            'note',
            'logistics',
            'expenseLines',
            'noteEntries',
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
    }

    /**
     * @param array<int, array<string, mixed>> $lines
     */
    private function replaceExpenseLines(int $transactionId, array $lines): void
    {
        TransactionExpenseLine::query()->where('transaction_id', $transactionId)->delete();
        if ($lines === []) {
            return;
        }

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
     * @param array<int, array<string, mixed>> $entries
     */
    private function replaceNoteEntries(int $transactionId, array $entries): void
    {
        TransactionNoteEntry::query()->where('transaction_id', $transactionId)->delete();
        if ($entries === []) {
            return;
        }

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
}
