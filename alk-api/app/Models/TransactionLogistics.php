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
        'packaging_date_approved',
        'feeder_vessel',
        'mother_vessel',
        'container_no',
        'seal_no',
        'lc_no',
        'temperature_recorder_no',
        'temperature_recorder_location_row_no',
        'etd_date',
        'eta_date',
        'qc_inspection_date',
        'discharge',
        'at',
        'discharge_at',
        'service_type',
        'bl_date',
        'bl_no',
        'port',
        'destination',
        'shipping_line_agent',
        'sc_inv_to_customer',
        'packer_inv_date',
        'packer_inv',
        'cancel_claim',
        'cancel_reject',
        'cancel_move',
    ];

    protected $casts = [
        'plan_etd' => 'date:Y-m-d',
        'plan_eta' => 'date:Y-m-d',
        'packaging_date_inner' => 'date:Y-m-d',
        'packaging_date_outer' => 'date:Y-m-d',
        'packaging_date_approved' => 'date:Y-m-d',
        'etd_date' => 'date:Y-m-d',
        'eta_date' => 'date:Y-m-d',
        'qc_inspection_date' => 'date:Y-m-d',
        'bl_date' => 'date:Y-m-d',
        'packer_inv_date' => 'date:Y-m-d',
        'cancel_claim' => 'boolean',
        'cancel_reject' => 'boolean',
        'cancel_move' => 'boolean',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
