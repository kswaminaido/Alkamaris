<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RevenueCustomer extends Model
{
    protected $table = 'revenue_customer';

    protected $fillable = [
        'transaction_id',
        'total_selling_value',
        'total_selling_currency',
        'commission_enabled',
        'commission_percent',
        'amount',
        'amount_currency',
        'description',
        'rebate_memo_amount',
        'rebate_memo_description',
        'overcharge_sc_amount',
        'overcharge_sc_description',
    ];

    protected $casts = [
        'total_selling_value' => 'decimal:2',
        'commission_enabled' => 'boolean',
        'commission_percent' => 'decimal:2',
        'amount' => 'decimal:2',
        'rebate_memo_amount' => 'decimal:2',
        'overcharge_sc_amount' => 'decimal:2',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
