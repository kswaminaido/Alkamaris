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
use App\Models\TransactionNote;
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
            ->with([
                'salesPerson:id,name,email',
                'createdBy:id,name,email',
                'generalInfoCustomer',
                'generalInfoPacker',
                'revenueCustomer',
                'revenuePacker',
                'shippingDetailsCustomer',
                'shippingDetailsPacker',
            ])
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

            GeneralInfoCustomer::query()->create([
                'transaction_id' => $transaction->id,
                ...($validated['general_info_customer'] ?? []),
            ]);

            GeneralInfoPacker::query()->create([
                'transaction_id' => $transaction->id,
                ...($validated['general_info_packer'] ?? []),
            ]);

            RevenueCustomer::query()->create([
                'transaction_id' => $transaction->id,
                ...($validated['revenue_customer'] ?? []),
            ]);

            RevenuePacker::query()->create([
                'transaction_id' => $transaction->id,
                ...($validated['revenue_packer'] ?? []),
            ]);

            CashFlowCustomer::query()->create([
                'transaction_id' => $transaction->id,
                ...($validated['cash_flow_customer'] ?? []),
            ]);

            CashFlowPacker::query()->create([
                'transaction_id' => $transaction->id,
                ...($validated['cash_flow_packer'] ?? []),
            ]);

            ShippingDetailsCustomer::query()->create([
                'transaction_id' => $transaction->id,
                ...($validated['shipping_details_customer'] ?? []),
            ]);

            ShippingDetailsPacker::query()->create([
                'transaction_id' => $transaction->id,
                ...($validated['shipping_details_packer'] ?? []),
            ]);

            TransactionNote::query()->create([
                'transaction_id' => $transaction->id,
                ...($validated['notes'] ?? []),
            ]);

            return $transaction->load($this->relations());
        });

        return response()->json(['data' => $transaction], Response::HTTP_CREATED);
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
    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'transaction' => ['required', 'array'],
            'transaction.booking_no' => ['required', 'string', 'max:100', 'unique:transactions,booking_no'],
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
}
