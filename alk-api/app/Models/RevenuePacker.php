<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RevenuePacker extends Model
{
    protected $table = 'revenue_packer';

    protected $fillable = [
        'transaction_id',
        'total_buying_value',
        'total_buying_currency',
        'commission_enabled',
        'commission_percent',
        'amount',
        'amount_currency',
        'description',
        'overcharge_sc_amount',
        'overcharge_sc_description',
    ];

    protected $casts = [
        'total_buying_value' => 'decimal:2',
        'commission_enabled' => 'boolean',
        'commission_percent' => 'decimal:2',
        'amount' => 'decimal:2',
        'overcharge_sc_amount' => 'decimal:2',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
