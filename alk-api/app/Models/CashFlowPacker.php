<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashFlowPacker extends Model
{
    protected $table = 'cash_flow_packer';

    protected $fillable = [
        'transaction_id',
        'date_advance',
        'amount_advance',
        'invoice_date',
        'invoice_number',
        'date_balance',
        'amount_balance',
    ];

    protected $casts = [
        'date_advance' => 'date:Y-m-d',
        'amount_advance' => 'decimal:2',
        'invoice_date' => 'date:Y-m-d',
        'date_balance' => 'date:Y-m-d',
        'amount_balance' => 'decimal:2',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
