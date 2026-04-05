<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transactions\MoveTransactionItemRequest;
use App\Http\Requests\Transactions\StoreTransactionItemRequest;
use App\Http\Requests\Transactions\UpdateTransactionItemRequest;
use App\Http\Resources\Transactions\TransactionResource;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Services\Transactions\TransactionItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class TransactionItemController extends Controller
{
    public function __construct(
        private readonly TransactionItemService $transactionItemService,
    ) {}

    public function store(StoreTransactionItemRequest $request, Transaction $transaction): JsonResponse
    {
        $validated = $request->validated();
        $updated = $this->transactionItemService->create($transaction, $validated['item'] ?? []);

        return response()->json([
            'data' => TransactionResource::make($updated),
            'message' => 'Transaction item created successfully.',
        ], Response::HTTP_CREATED);
    }

    public function update(UpdateTransactionItemRequest $request, Transaction $transaction, TransactionItem $item): JsonResponse
    {
        $this->ensureBelongsToTransaction($transaction, $item);

        $validated = $request->validated();
        $updated = $this->transactionItemService->update($transaction, $item, $validated['item'] ?? []);

        return response()->json([
            'data' => TransactionResource::make($updated),
            'message' => 'Transaction item updated successfully.',
        ]);
    }

    public function destroy(Transaction $transaction, TransactionItem $item): JsonResponse
    {
        $this->ensureBelongsToTransaction($transaction, $item);

        $updated = $this->transactionItemService->delete($transaction, $item);

        return response()->json([
            'data' => TransactionResource::make($updated),
            'message' => 'Transaction item deleted successfully.',
        ]);
    }

    public function duplicate(Transaction $transaction, TransactionItem $item): JsonResponse
    {
        $this->ensureBelongsToTransaction($transaction, $item);

        $updated = $this->transactionItemService->duplicate($transaction, $item);

        return response()->json([
            'data' => TransactionResource::make($updated),
            'message' => 'Transaction item duplicated successfully.',
        ], Response::HTTP_CREATED);
    }

    public function move(MoveTransactionItemRequest $request, Transaction $transaction, TransactionItem $item): JsonResponse
    {
        $this->ensureBelongsToTransaction($transaction, $item);

        $updated = $this->transactionItemService->move($transaction, $item, (string) $request->validated('direction'));

        return response()->json([
            'data' => TransactionResource::make($updated),
            'message' => 'Transaction item reordered successfully.',
        ]);
    }

    private function ensureBelongsToTransaction(Transaction $transaction, TransactionItem $item): void
    {
        abort_unless($item->transaction_id === $transaction->id, Response::HTTP_NOT_FOUND);
    }
}
