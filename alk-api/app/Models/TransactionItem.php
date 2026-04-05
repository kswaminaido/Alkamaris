<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionItem extends Model
{
    protected $fillable = [
        'transaction_id',
        'product',
        'style',
        'packing',
        'media',
        'notes',
        'brand',
        'secondary_packaging',
        'item_code',
        'customer_lot_no',
        'size',
        'glaze_percentage',
        'total_weight_value',
        'total_weight_unit_category',
        'total_weight_unit_slug',
        'qty_value',
        'qty_unit',
        'qty_booking',
        'selling_unit_price',
        'selling_currency',
        'selling_unit_category',
        'selling_unit_slug',
        'selling_total',
        'selling_correction',
        'lqd_qty',
        'lqd_price',
        'lqd_currency',
        'lqd_unit_category',
        'lqd_unit_slug',
        'lqd_total',
        'buying_unit_price',
        'buying_currency',
        'buying_unit_category',
        'buying_unit_slug',
        'buying_total',
        'buying_correction',
        'rebate_rate_packer',
        'rebate_rate_packer_currency',
        'rebate_rate_packer_unit_category',
        'rebate_rate_packer_unit_slug',
        'rebate_rate_packer_total',
        'rebate_rate_customer',
        'rebate_rate_customer_currency',
        'rebate_rate_customer_unit_category',
        'rebate_rate_customer_unit_slug',
        'rebate_rate_customer_total',
        'total_ctn_correction',
        'total_nw_correction',
        'commission_from_packer',
        'commission_from_packer_unit_category',
        'commission_from_packer_unit_slug',
        'total_packer_commission',
        'commission_from_customer',
        'commission_from_customer_unit_category',
        'commission_from_customer_unit_slug',
        'total_customer_commission',
        'sort_order',
    ];

    protected $casts = [
        'glaze_percentage' => 'decimal:2',
        'total_weight_value' => 'decimal:5',
        'qty_value' => 'decimal:5',
        'qty_booking' => 'decimal:5',
        'selling_unit_price' => 'decimal:5',
        'selling_total' => 'decimal:5',
        'selling_correction' => 'decimal:5',
        'lqd_qty' => 'decimal:5',
        'lqd_price' => 'decimal:5',
        'lqd_total' => 'decimal:5',
        'buying_unit_price' => 'decimal:5',
        'buying_total' => 'decimal:5',
        'buying_correction' => 'decimal:5',
        'rebate_rate_packer' => 'decimal:5',
        'rebate_rate_packer_total' => 'decimal:5',
        'rebate_rate_customer' => 'decimal:5',
        'rebate_rate_customer_total' => 'decimal:5',
        'total_ctn_correction' => 'decimal:5',
        'total_nw_correction' => 'decimal:5',
        'commission_from_packer' => 'decimal:5',
        'total_packer_commission' => 'decimal:5',
        'commission_from_customer' => 'decimal:5',
        'total_customer_commission' => 'decimal:5',
        'sort_order' => 'integer',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
