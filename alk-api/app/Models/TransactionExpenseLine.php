<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionExpenseLine extends Model
{
    protected $table = 'transaction_expense_lines';

    protected $fillable = [
        'transaction_id',
        'section',
        'group_name',
        'line_key',
        'line_label',
        'amount',
        'currency',
        'description',
        'sort_order',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
