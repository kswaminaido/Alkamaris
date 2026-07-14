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
use App\Services\Audit\UserEventLogger;
use App\Services\Transactions\TransactionService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TransactionController extends Controller
{
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
            $query->where('status', $status);
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

        $sortUnshippedAscending = ! request()->boolean('overdue_invoice')
            && request('status') === TransactionStatus::Unshipped->value
            && request('sort_direction') === 'asc';

        if ($sortUnshippedAscending) {
            $query->orderBy('created_at')->orderBy('id');
        } else {
            $query->orderByDesc('created_at')->orderByDesc('id');
        }

        $paginator = $query->paginate($perPage);

        return (new TransactionCollection($paginator))->response();
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

        return (new TransactionCollection($paginator))->response();
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

        return response()->json([
            'data' => [
                'total_collected_commission' => round((float) ($summary?->total_collected_commission ?? 0), 5),
                'total_pending_commission' => round((float) ($summary?->total_pending_commission ?? 0), 5),
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
