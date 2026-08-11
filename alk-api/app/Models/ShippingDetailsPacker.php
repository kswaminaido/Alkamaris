<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingDetailsPacker extends Model
{
    protected $table = 'shipping_details_packer';

    protected $fillable = [
        'transaction_id',
        'lsd_min',
        'lsd_max',
        'presentation_days',
        'lc_expiry',
        'req_eta',
    ];

    protected $casts = [
        'lsd_min' => 'date:Y-m-d',
        'lsd_max' => 'date:Y-m-d',
        'presentation_days' => 'integer',
        'lc_expiry' => 'date:Y-m-d',
        'req_eta' => 'date:Y-m-d',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
