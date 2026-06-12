<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transactions\MoveTransactionItemRequest;
use App\Http\Requests\Transactions\StoreTransactionItemRequest;
use App\Http\Requests\Transactions\UpdateTransactionItemRequest;
use App\Http\Resources\Transactions\TransactionResource;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Services\Audit\UserEventLogger;
use App\Services\Transactions\TransactionItemOptionService;
use App\Services\Transactions\TransactionItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class TransactionItemController extends Controller
{
    public function __construct(
        private readonly TransactionItemService $transactionItemService,
        private readonly TransactionItemOptionService $transactionItemOptionService,
        private readonly UserEventLogger $userEventLogger,
    ) {}

    public function options(): JsonResponse
    {
        return response()->json([
            'data' => $this->transactionItemOptionService->all(),
        ]);
    }

    public function store(StoreTransactionItemRequest $request, Transaction $transaction): JsonResponse
    {
        $validated = $request->validated();
        $updated = $this->transactionItemService->create($transaction, $validated['item'] ?? []);
        $createdItem = $updated->items->sortByDesc('id')->first();

        $this->userEventLogger->log(
            $request->user(),
            'Transaction Item',
            'Transaction item created',
            $createdItem?->id,
            newValues: $createdItem?->toArray() ?? [],
            description: "Transaction item created for transaction ID {$transaction->id}",
            context: ['transaction_id' => $transaction->id],
        );

        return response()->json([
            'data' => TransactionResource::make($updated),
            'message' => 'Transaction item created successfully.',
        ], Response::HTTP_CREATED);
    }

    public function update(UpdateTransactionItemRequest $request, Transaction $transaction, TransactionItem $item): JsonResponse
    {
        $this->ensureBelongsToTransaction($transaction, $item);

        $oldValues = $item->toArray();
        $validated = $request->validated();
        $updated = $this->transactionItemService->update($transaction, $item, $validated['item'] ?? []);
        $updatedItem = $updated->items->firstWhere('id', $item->id);

        $this->userEventLogger->log(
            $request->user(),
            'Transaction Item',
            'Transaction item updated',
            $item->id,
            oldValues: $oldValues,
            newValues: $updatedItem?->toArray() ?? [],
            description: "Transaction item updated with ID {$item->id}",
            context: ['transaction_id' => $transaction->id],
        );

        return response()->json([
            'data' => TransactionResource::make($updated),
            'message' => 'Transaction item updated successfully.',
        ]);
    }

    public function destroy(Transaction $transaction, TransactionItem $item): JsonResponse
    {
        $this->ensureBelongsToTransaction($transaction, $item);

        $oldValues = $item->toArray();
        $updated = $this->transactionItemService->delete($transaction, $item);

        $this->userEventLogger->log(
            request()->user(),
            'Transaction Item',
            'Transaction item deleted',
            $item->id,
            oldValues: $oldValues,
            description: "Transaction item deleted with ID {$item->id}",
            context: ['transaction_id' => $transaction->id],
        );

        return response()->json([
            'data' => TransactionResource::make($updated),
            'message' => 'Transaction item deleted successfully.',
        ]);
    }

    public function duplicate(Transaction $transaction, TransactionItem $item): JsonResponse
    {
        $this->ensureBelongsToTransaction($transaction, $item);

        $updated = $this->transactionItemService->duplicate($transaction, $item);
        $duplicatedItem = $updated->items
            ->where('id', '!=', $item->id)
            ->sortByDesc('id')
            ->first();

        $this->userEventLogger->log(
            request()->user(),
            'Transaction Item',
            'Transaction item duplicated',
            $duplicatedItem?->id,
            oldValues: $item->toArray(),
            newValues: $duplicatedItem?->toArray() ?? [],
            description: "Transaction item duplicated for transaction ID {$transaction->id}",
            context: ['transaction_id' => $transaction->id],
        );

        return response()->json([
            'data' => TransactionResource::make($updated),
            'message' => 'Transaction item duplicated successfully.',
        ], Response::HTTP_CREATED);
    }

    public function move(MoveTransactionItemRequest $request, Transaction $transaction, TransactionItem $item): JsonResponse
    {
        $this->ensureBelongsToTransaction($transaction, $item);

        $oldValues = $item->toArray();
        $updated = $this->transactionItemService->move($transaction, $item, (string) $request->validated('direction'));
        $updatedItem = $updated->items->firstWhere('id', $item->id);

        $this->userEventLogger->log(
            $request->user(),
            'Transaction Item',
            'Transaction item reordered',
            $item->id,
            oldValues: $oldValues,
            newValues: $updatedItem?->toArray() ?? [],
            description: "Transaction item reordered with ID {$item->id}",
            context: [
                'transaction_id' => $transaction->id,
                'direction' => $request->validated('direction'),
            ],
        );

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
