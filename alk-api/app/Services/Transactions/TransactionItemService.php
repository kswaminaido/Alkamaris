<?php

namespace App\Services\Transactions;

use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Support\Facades\DB;

final class TransactionItemService
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(Transaction $transaction, array $payload): Transaction
    {
        return DB::transaction(function () use ($transaction, $payload): Transaction {
            $sortOrder = (int) ($payload['sort_order'] ?? ($transaction->items()->max('sort_order') ?? -1) + 1);

            $transaction->items()->create([
                ...$payload,
                'sort_order' => $sortOrder,
            ]);

            return $transaction->fresh()->load(Transaction::detailRelations());
        });
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function update(Transaction $transaction, TransactionItem $item, array $payload): Transaction
    {
        return DB::transaction(function () use ($transaction, $item, $payload): Transaction {
            $item->update($payload);

            return $transaction->fresh()->load(Transaction::detailRelations());
        });
    }

    public function delete(Transaction $transaction, TransactionItem $item): Transaction
    {
        return DB::transaction(function () use ($transaction, $item): Transaction {
            $item->delete();
            $this->resequence($transaction);

            return $transaction->fresh()->load(Transaction::detailRelations());
        });
    }

    public function duplicate(Transaction $transaction, TransactionItem $item): Transaction
    {
        return DB::transaction(function () use ($transaction, $item): Transaction {
            $payload = $item->toArray();
            unset($payload['id'], $payload['created_at'], $payload['updated_at']);
            $payload['sort_order'] = (int) $item->sort_order + 1;

            $transaction->items()
                ->where('sort_order', '>', $item->sort_order)
                ->increment('sort_order');

            $transaction->items()->create($payload);

            return $transaction->fresh()->load(Transaction::detailRelations());
        });
    }

    public function move(Transaction $transaction, TransactionItem $item, string $direction): Transaction
    {
        return DB::transaction(function () use ($transaction, $item, $direction): Transaction {
            $operator = $direction === 'up' ? '<' : '>';
            $sortDirection = $direction === 'up' ? 'desc' : 'asc';

            $swapWith = $transaction->items()
                ->where('id', '!=', $item->id)
                ->where('sort_order', $operator, $item->sort_order)
                ->orderBy('sort_order', $sortDirection)
                ->first();

            if ($swapWith) {
                $originalSort = $item->sort_order;
                $item->update(['sort_order' => $swapWith->sort_order]);
                $swapWith->update(['sort_order' => $originalSort]);
            }

            return $transaction->fresh()->load(Transaction::detailRelations());
        });
    }

    private function resequence(Transaction $transaction): void
    {
        $transaction->items()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->each(function (TransactionItem $item, int $index): void {
                if ($item->sort_order !== $index) {
                    $item->update(['sort_order' => $index]);
                }
            });
    }
}
