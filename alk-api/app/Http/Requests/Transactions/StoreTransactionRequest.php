<?php

namespace App\Http\Requests\Transactions;

final class StoreTransactionRequest extends TransactionPayloadRequest
{
    /**
     * @return array<int, mixed>
     */
    protected function bookingNoRules(): array
    {
        return ['nullable', 'string', 'max:100', $this->bookingNoRule()];
    }
}
