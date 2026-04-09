<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transactions\StoreTransactionRequest;
use App\Http\Requests\Transactions\UpdateTransactionRequest;
use App\Http\Resources\Transactions\TransactionCollection;
use App\Http\Resources\Transactions\TransactionResource;
use App\Models\Transaction;
use App\Services\Transactions\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TransactionController extends Controller
{
    public function __construct(
        private readonly TransactionService $transactionService,
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
        } elseif ($user->role->value === 'vendor') {
            $query->whereHas('generalInfoPacker', function ($q) use ($user) {
                $q->where('vendor', $user->name);
            });
        }
        // Admin sees all transactions (no additional filtering)

        if ($bookingNo = request('booking_no')) {
            $query->where('booking_no', 'like', "%{$bookingNo}%");
        }

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

    public function show(Transaction $transaction): JsonResponse
    {
        $transaction->load(Transaction::detailRelations());

        return TransactionResource::make($transaction)->response();
    }

    public function store(StoreTransactionRequest $request): JsonResponse
    {
        $transaction = $this->transactionService->create($request->validated(), $request->user());

        return TransactionResource::make($transaction)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateTransactionRequest $request, Transaction $transaction): JsonResponse
    {
        $updated = $this->transactionService->update($transaction, $request->validated());

        return TransactionResource::make($updated)->response();
    }

    public function duplicate(Request $request, Transaction $transaction): JsonResponse
    {
        $duplicate = $this->transactionService->duplicate($transaction, $request->user());

        return response()->json(
            ['data' => TransactionResource::make($duplicate), 'message' => 'Transaction duplicated successfully.'],
            Response::HTTP_CREATED,
        );
    }
}
