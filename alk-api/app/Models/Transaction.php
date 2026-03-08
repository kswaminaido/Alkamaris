<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Transaction extends Model
{
    protected $fillable = [
        'booking_no',
        'booking_mode',
        'issue_date',
        'sales_person_id',
        'product_origin',
        'destination',
        'category',
        'type',
        'country',
        'container_primary',
        'container_secondary',
        'certified',
        'net_margin',
        'created_by_user_id',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'certified' => 'boolean',
        'net_margin' => 'decimal:2',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function salesPerson(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_person_id');
    }

    public function generalInfoCustomer(): HasOne
    {
        return $this->hasOne(GeneralInfoCustomer::class);
    }

    public function generalInfoPacker(): HasOne
    {
        return $this->hasOne(GeneralInfoPacker::class);
    }

    public function revenueCustomer(): HasOne
    {
        return $this->hasOne(RevenueCustomer::class);
    }

    public function revenuePacker(): HasOne
    {
        return $this->hasOne(RevenuePacker::class);
    }

    public function cashFlowCustomer(): HasOne
    {
        return $this->hasOne(CashFlowCustomer::class);
    }

    public function cashFlowPacker(): HasOne
    {
        return $this->hasOne(CashFlowPacker::class);
    }

    public function shippingDetailsCustomer(): HasOne
    {
        return $this->hasOne(ShippingDetailsCustomer::class);
    }

    public function shippingDetailsPacker(): HasOne
    {
        return $this->hasOne(ShippingDetailsPacker::class);
    }

    public function note(): HasOne
    {
        return $this->hasOne(TransactionNote::class);
    }
}
