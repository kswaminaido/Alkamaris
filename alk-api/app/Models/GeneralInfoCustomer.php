<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneralInfoCustomer extends Model
{
    protected $table = 'general_info_customer';

    protected $fillable = [
        'transaction_id',
        'customer',
        'attention',
        'ship_to',
        'buyer',
        'buyer_number',
        'end_customer',
        'prices_customer_type',
        'prices_customer_rate',
        'payment_customer_term',
        'payment_customer_type',
        'payment_customer_advance_percent',
        'description',
        'tolerance',
        'marketing_fee',
    ];

    protected $casts = [
        'prices_customer_rate' => 'decimal:4',
        'payment_customer_advance_percent' => 'decimal:2',
        'marketing_fee' => 'boolean',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
