<?php

namespace App\Http\Controllers\Api;

use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Transactions\StoreTransactionRequest;
use App\Http\Requests\Transactions\UpdateTransactionRequest;
use App\Http\Resources\Transactions\TransactionCollection;
use App\Http\Resources\Transactions\TransactionResource;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\UsersEventLog;
use App\Services\Audit\UserEventLogger;
use App\Services\Transactions\TransactionService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Pagination\LengthAwarePaginator;

class TransactionController extends Controller
{
    private const LAST_MODIFIED_ACTIONS = [
        'Transaction updated',
        'Status updated',
        'Transaction created',
    ];

    public function __construct(
        private readonly TransactionService $transactionService,
        private readonly UserEventLogger $userEventLogger,
    ) {}

    public function index(): JsonResponse
    {
        $perPage = (int) request()->integer('per_page', 20);
        $perPage = max(5, min($perPage, 100));

        $query = Transaction::query()
            ->with(Transaction::detailRelations());

        // Filter transactions based on user role
        $user = request()->user();
        if ($user->role->value === 'sales') {
            $query->where('sales_person_id', $user->id);
        } elseif ($user->role->value === 'customer') {
            $query->whereHas('generalInfoCustomer', function ($q) use ($user) {
                $q->where('customer', $user->name);
            });
        } elseif (in_array($user->role->value, [UserRole::Packer->value], true)) {
            $query->whereHas('generalInfoPacker', function ($q) use ($user) {
                $q->where('vendor', $user->name);
            });
        }
        // Admin sees all transactions (no additional filtering)

        if ($bookingNo = request('booking_no')) {
            $query->where('booking_no', 'like', "%{$bookingNo}%");
        }

        if ($vendor = request('vendor')) {
            $query->whereHas('generalInfoPacker', function ($q) use ($vendor) {
                $q->where('vendor', 'like', "%{$vendor}%");
            });
        }

        if ($customer = request('customer')) {
            $query->whereHas('generalInfoCustomer', function ($q) use ($customer) {
                $q->where('customer', 'like', "%{$customer}%");
            });
        }

        if (request()->filled('sales_person_id')) {
            $query->where('sales_person_id', (int) request('sales_person_id'));
        }

        if (request()->boolean('overdue_invoice')) {
            $today = CarbonImmutable::now()->toDateString();

            $query
                ->where('status', TransactionStatus::Unshipped->value)
                ->where(function ($query) use ($today) {
                    $query
                        ->whereHas('shippingDetailsCustomer', function ($query) use ($today) {
                            $query->where('lsd_min', '<', $today);
                        })
                        ->orWhereHas('shippingDetailsPacker', function ($query) use ($today) {
                            $query->where('lsd_min', '<', $today);
                        });
                });
        } elseif ($status = request('status')) {
            if ($status === TransactionStatus::Shipped->value) {
                $query->whereIn('status', [
                    TransactionStatus::Shipped->value,
                    TransactionStatus::Received->value,
                    TransactionStatus::Paid->value,
                    TransactionStatus::Invoice->value,
                ]);
            } else {
                $query->where('status', $status);
            }
        }

        if (request()->boolean('has_qc_inspection_date')) {
            $query->whereHas('logistics', function ($query) {
                $query->whereNotNull('qc_inspection_date');
            });
        }

        if ($fromDate = request('from_date')) {
            $query->whereDate('updated_at', '>=', $fromDate);
        }

        if ($toDate = request('to_date')) {
            $query->whereDate('updated_at', '<=', $toDate);
        }

        $summary = $this->transactionIndexSummary($query);

        $sortUnshippedAscending = ! request()->boolean('overdue_invoice')
            && request('status') === TransactionStatus::Unshipped->value
            && request('sort_direction') === 'asc';

        if ($sortUnshippedAscending) {
            $query->orderBy('created_at')->orderBy('id');
        } else {
            $query->orderByDesc('created_at')->orderByDesc('id');
        }

        $paginator = $query->paginate($perPage);
        $this->preloadLastModifiedEvents($paginator);

        return (new TransactionCollection($paginator))
            ->additional(['summary' => $summary])
            ->response();
    }

    /**
     * @return array{buyer_commission_total: float, packer_commission_total: float, total_commission: float, unshipped_count: int}
     */
    private function transactionIndexSummary(Builder $query): array
    {
        $matchingTransactionIds = (clone $query)
            ->select('transactions.id');

        $unshippedCount = (clone $query)
            ->where('status', TransactionStatus::Unshipped->value)
            ->count();

        $summary = TransactionItem::query()
            ->whereIn('transaction_id', $matchingTransactionIds)
            ->selectRaw('COALESCE(SUM(total_customer_commission), 0) as buyer_commission_total')
            ->selectRaw('COALESCE(SUM(total_packer_commission), 0) as packer_commission_total')
            ->first();

        $buyerCommissionTotal = round((float) ($summary?->buyer_commission_total ?? 0), 5);
        $packerCommissionTotal = round((float) ($summary?->packer_commission_total ?? 0), 5);

        return [
            'buyer_commission_total' => $buyerCommissionTotal,
            'packer_commission_total' => $packerCommissionTotal,
            'total_commission' => round($buyerCommissionTotal + $packerCommissionTotal, 5),
            'unshipped_count' => $unshippedCount,
        ];
    }

    public function summaryReports(): JsonResponse
    {
        $perPage = (int) request()->integer('per_page', 20);
        $perPage = max(5, min($perPage, 100));

        $query = Transaction::query()
            ->with(Transaction::detailRelations());

        // Filter transactions based on user role
        $user = request()->user();
        if ($user->role->value === 'sales') {
            $query->where('sales_person_id', $user->id);
        } elseif ($user->role->value === 'customer') {
            $query->whereHas('generalInfoCustomer', function ($q) use ($user) {
                $q->where('customer', $user->name);
            });
        } elseif (in_array($user->role->value, [UserRole::Packer->value], true)) {
            $query->whereHas('generalInfoPacker', function ($q) use ($user) {
                $q->where('vendor', $user->name);
            });
        }

        if ($bookingNo = request('booking_no')) {
            $query->where('booking_no', 'like', "%{$bookingNo}%");
        }

        if ($vendor = request('vendor')) {
            $query->whereHas('generalInfoPacker', function ($q) use ($vendor) {
                $q->where('vendor', 'like', "%{$vendor}%");
            });
        }

        if ($customer = request('customer')) {
            $query->whereHas('generalInfoCustomer', function ($q) use ($customer) {
                $q->where('customer', 'like', "%{$customer}%");
            });
        }

        // Summary reports only include transactions with status "I"
        $query->where('status', 'I');

        if ($fromDate = request('from_date')) {
            $query->whereDate('updated_at', '>=', $fromDate);
        }

        if ($toDate = request('to_date')) {
            $query->whereDate('updated_at', '<=', $toDate);
        }

        $paginator = $query
            ->orderByDesc('id')
            ->paginate($perPage);
        $this->preloadLastModifiedEvents($paginator);

        return (new TransactionCollection($paginator))->response();
    }

    /**
     * Avoid per-row audit-log lookups while serializing paginated transaction lists.
     */
    private function preloadLastModifiedEvents(LengthAwarePaginator $paginator): void
    {
        $transactions = $paginator->getCollection();
        $transactionIds = $transactions
            ->pluck('id')
            ->filter()
            ->values();

        if ($transactionIds->isEmpty()) {
            return;
        }

        $events = UsersEventLog::query()
            ->with('user:id,name,email')
            ->where('event_type', 'Transaction')
            ->whereIn('data->record_id', $transactionIds->all())
            ->whereIn('data->action', self::LAST_MODIFIED_ACTIONS)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $updatedEvents = $events
            ->filter(static fn (UsersEventLog $event): bool => in_array($event->data['action'] ?? null, [
                'Transaction updated',
                'Status updated',
            ], true))
            ->unique(static fn (UsersEventLog $event): int|string|null => $event->data['record_id'] ?? null)
            ->keyBy(static fn (UsersEventLog $event): string => (string) ($event->data['record_id'] ?? ''));

        $createdEvents = $events
            ->filter(static fn (UsersEventLog $event): bool => ($event->data['action'] ?? null) === 'Transaction created')
            ->unique(static fn (UsersEventLog $event): int|string|null => $event->data['record_id'] ?? null)
            ->keyBy(static fn (UsersEventLog $event): string => (string) ($event->data['record_id'] ?? ''));

        $transactions->each(function (Transaction $transaction) use ($updatedEvents, $createdEvents): void {
            $key = (string) $transaction->id;

            $transaction->setRelation(
                'lastModifiedEvent',
                $updatedEvents->get($key) ?? $createdEvents->get($key)
            );
        });
    }

    public function commissionSummary(): JsonResponse
    {
        $commissionExpression = 'COALESCE(transaction_items.total_packer_commission, 0) + COALESCE(transaction_items.total_customer_commission, 0)';
        $collectedStatus = TransactionStatus::Received->value;

        $summary = TransactionItem::query()
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->selectRaw("COALESCE(SUM(CASE WHEN transactions.status = ? THEN {$commissionExpression} ELSE 0 END), 0) as total_collected_commission", [$collectedStatus])
            ->selectRaw("COALESCE(SUM(CASE WHEN transactions.status <> ? THEN {$commissionExpression} ELSE 0 END), 0) as total_pending_commission", [$collectedStatus])
            ->first();

        $statusCounts = Transaction::query()
            ->selectRaw('status, COUNT(*) as transaction_count')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(function (Transaction $transaction): array {
                $status = $transaction->status instanceof TransactionStatus
                    ? $transaction->status->value
                    : (string) $transaction->status;

                return [$status => (int) $transaction->transaction_count];
            });

        $statusCommissionValues = TransactionItem::query()
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->selectRaw('transactions.status as status')
            ->selectRaw("COALESCE(SUM({$commissionExpression}), 0) as total_commission_value")
            ->groupBy('transactions.status')
            ->get()
            ->mapWithKeys(function (TransactionItem $item): array {
                $status = (string) $item->status;

                return [$status => round((float) ($item->total_commission_value ?? 0), 5)];
            });

        return response()->json([
            'data' => [
                'total_collected_commission' => round((float) ($summary?->total_collected_commission ?? 0), 5),
                'total_pending_commission' => round((float) ($summary?->total_pending_commission ?? 0), 5),
                'status_summary' => collect(TransactionStatus::cases())
                    ->map(fn (TransactionStatus $status): array => [
                        'status' => $status->value,
                        'label' => $status->label(),
                        'transaction_count' => $statusCounts->get($status->value, 0),
                        'total_commission_value' => $statusCommissionValues->get($status->value, 0),
                    ])
                    ->values()
                    ->all(),
            ],
        ]);
    }

    public function show(Transaction $transaction): JsonResponse
    {
        $transaction->load(Transaction::detailRelations());

        return TransactionResource::make($transaction)->response();
    }

    public function store(StoreTransactionRequest $request): JsonResponse
    {
        $transaction = $this->transactionService->create($request->validated(), $request->user());

        $this->userEventLogger->log(
            $request->user(),
            'Transaction',
            'Transaction created',
            $transaction->id,
            newValues: [
                'id' => $transaction->id,
                'booking_no' => $transaction->booking_no,
                'status' => $transaction->status?->value ?? $transaction->status,
            ],
            description: "Transaction created with ID {$transaction->id}",
        );

        return TransactionResource::make($transaction)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateTransactionRequest $request, Transaction $transaction): JsonResponse
    {
        $transaction->load(Transaction::detailRelations());
        $oldValues = $transaction->toArray();
        $oldStatus = $transaction->status?->value ?? $transaction->status;
        $updated = $this->transactionService->update($transaction, $request->validated());
        $newStatus = $updated->status?->value ?? $updated->status;
        $action = $oldStatus !== $newStatus ? 'Status updated' : 'Transaction updated';

        $this->userEventLogger->log(
            $request->user(),
            'Transaction',
            $action,
            $updated->id,
            oldValues: $oldValues,
            newValues: $updated->toArray(),
            description: "{$action} with ID {$updated->id}",
        );

        return TransactionResource::make($updated)->response();
    }

    public function duplicate(Request $request, Transaction $transaction): JsonResponse
    {
        $duplicate = $this->transactionService->duplicate($transaction, $request->user());

        $this->userEventLogger->log(
            $request->user(),
            'Transaction',
            'Transaction duplicated',
            $duplicate->id,
            oldValues: [
                'source_transaction_id' => $transaction->id,
                'source_booking_no' => $transaction->booking_no,
            ],
            newValues: [
                'id' => $duplicate->id,
                'booking_no' => $duplicate->booking_no,
            ],
            description: "Transaction duplicated with ID {$duplicate->id}",
        );

        return response()->json(
            ['data' => TransactionResource::make($duplicate), 'message' => 'Transaction duplicated successfully.'],
            Response::HTTP_CREATED,
        );
    }
}
