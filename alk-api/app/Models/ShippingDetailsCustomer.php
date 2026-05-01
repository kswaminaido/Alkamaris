<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingDetailsCustomer extends Model
{
    protected $table = 'shipping_details_customer';

    protected $fillable = [
        'transaction_id',
        'lsd_min',
        'lsd_max',
        'presentation_days',
        'lc_expiry',
        'req_eta',
    ];

    protected $casts = [
        'lsd_min' => 'date',
        'lsd_max' => 'date',
        'presentation_days' => 'integer',
        'lc_expiry' => 'date',
        'req_eta' => 'date',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
