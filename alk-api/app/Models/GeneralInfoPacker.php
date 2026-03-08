<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneralInfoPacker extends Model
{
    protected $table = 'general_info_packer';

    protected $fillable = [
        'transaction_id',
        'vendor',
        'packer_name',
        'packer_number',
        'packed_by',
        'prices_packer_type',
        'prices_packer_rate',
        'payment_packer_term',
        'payment_packer_type',
        'payment_packer_advance_percent',
        'description',
        'tolerance',
        'total_lqd_price',
        'consignee',
    ];

    protected $casts = [
        'prices_packer_rate' => 'decimal:4',
        'payment_packer_advance_percent' => 'decimal:2',
        'total_lqd_price' => 'decimal:2',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
