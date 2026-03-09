<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionLogistics extends Model
{
    protected $table = 'transaction_logistics';

    protected $fillable = [
        'transaction_id',
        'plan_etd',
        'plan_eta',
        'packaging_date_inner',
        'packaging_date_outer',
        'feeder_vessel',
        'mother_vessel',
        'container_no',
        'seal_no',
        'lc_no',
        'temperature_recorder_no',
        'etd_date',
        'eta_date',
        'qc_inspection_date',
        'discharge_at',
        'service_type',
        'bl_date',
        'bl_no',
        'port',
        'destination',
        'shipping_line_agent',
        'packer_inv_date',
        'packer_inv',
        'cancel_claim',
        'cancel_reject',
        'cancel_move',
    ];

    protected $casts = [
        'plan_etd' => 'date',
        'plan_eta' => 'date',
        'packaging_date_inner' => 'date',
        'packaging_date_outer' => 'date',
        'etd_date' => 'date',
        'eta_date' => 'date',
        'qc_inspection_date' => 'date',
        'bl_date' => 'date',
        'packer_inv_date' => 'date',
        'cancel_claim' => 'boolean',
        'cancel_reject' => 'boolean',
        'cancel_move' => 'boolean',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
