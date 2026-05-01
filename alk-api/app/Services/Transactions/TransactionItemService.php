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
            $payload = $this->applyDerivedTotals($payload);
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
            $item->update($this->applyDerivedTotals([
                ...$item->toArray(),
                ...$payload,
            ]));

            return $transaction->fresh()->load(Transaction::detailRelations());
        });
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function applyDerivedTotals(array $payload): array
    {
        $baseQuantity = $this->firstDefinedNumber(
            $payload['total_weight_value'] ?? null,
            $payload['qty_booking'] ?? null,
            $payload['qty_value'] ?? null,
        );
        $quantity = $this->firstDefinedNumber(
            $payload['qty_value'] ?? null,
            $payload['qty_booking'] ?? null,
        );
        $packingMultiplier = $this->extractPackingMultiplier($payload['packing'] ?? null);
        $sellingBase = $packingMultiplier * $quantity;
        $commissionBase = $packingMultiplier * $quantity;
        $commissionWeightBase = $this->firstDefinedNumber(
            $payload['total_weight_value'] ?? null,
            $commissionBase,
        );
        $packerCommissionRate = $this->normalizeNumber($payload['commission_from_packer'] ?? null);
        $customerCommissionRate = $this->normalizeNumber($payload['commission_from_customer'] ?? null);

        $payload['lqd_qty'] = $this->roundValue($baseQuantity);
        $payload['selling_total'] = $this->roundValue($sellingBase * $this->toNumber($payload['selling_unit_price'] ?? null) + $this->toNumber($payload['selling_correction'] ?? null));
        $payload['lqd_total'] = $this->roundValue($baseQuantity * $this->toNumber($payload['lqd_price'] ?? null));
        $payload['buying_total'] = $this->roundValue($baseQuantity * $this->toNumber($payload['buying_unit_price'] ?? null) + $this->toNumber($payload['buying_correction'] ?? null));
        $payload['rebate_rate_packer_total'] = $this->roundValue($commissionBase * $this->toNumber($payload['rebate_rate_packer'] ?? null), 4);
        $payload['rebate_rate_customer_total'] = $this->roundValue($commissionBase * $this->toNumber($payload['rebate_rate_customer'] ?? null), 4);
        $payload['total_packer_commission'] = $this->roundValue($packerCommissionRate === null ? 0.0 : $commissionWeightBase * $packerCommissionRate);
        $payload['total_customer_commission'] = $this->roundValue($customerCommissionRate === null ? 0.0 : $commissionWeightBase * $customerCommissionRate);

        return $payload;
    }

    private function firstDefinedNumber(mixed ...$values): float
    {
        foreach ($values as $value) {
            if ($value === null || $value === '') {
                continue;
            }

            return $this->toNumber($value);
        }

        return 0.0;
    }

    private function extractPackingMultiplier(mixed $value): float
    {
        if ($value === null) {
            return 0.0;
        }

        preg_match_all('/-?\d+(?:\.\d+)?/', trim((string) $value), $matches);
        $factors = array_values(array_filter(
            array_map(static fn (string $part): float => (float) $part, $matches[0] ?? []),
            static fn (float $part): bool => $part > 0
        ));

        if ($factors === []) {
            return 0.0;
        }

        return array_reduce($factors, static fn (float $product, float $factor): float => $product * $factor, 1.0);
    }

    private function toNumber(mixed $value): float
    {
        return is_numeric($value) ? (float) $value : 0.0;
    }

    private function normalizeNumber(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }

    private function roundValue(float $value, int $precision = 5): float
    {
        return round($value, $precision);
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
