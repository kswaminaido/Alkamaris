<?php

namespace App\Http\Resources\Transactions;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\TransactionItem */
final class TransactionItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_id' => $this->transaction_id,
            'product' => $this->product,
            'style' => $this->style,
            'packing' => $this->packing,
            'media' => $this->media,
            'notes' => $this->notes,
            'brand' => $this->brand,
            'secondary_packaging' => $this->secondary_packaging,
            'item_code' => $this->item_code,
            'customer_lot_no' => $this->customer_lot_no,
            'size' => $this->size,
            'glaze_percentage' => $this->glaze_percentage,
            'total_weight_value' => $this->total_weight_value,
            'total_weight_unit_category' => $this->total_weight_unit_category,
            'total_weight_unit_slug' => $this->total_weight_unit_slug,
            'qty_value' => $this->qty_value,
            'qty_unit' => $this->qty_unit,
            'qty_booking' => $this->qty_booking,
            'selling_unit_price' => $this->selling_unit_price,
            'selling_currency' => $this->selling_currency,
            'selling_unit_category' => $this->selling_unit_category,
            'selling_unit_slug' => $this->selling_unit_slug,
            'selling_total' => $this->selling_total,
            'selling_correction' => $this->selling_correction,
            'lqd_qty' => $this->lqd_qty,
            'lqd_price' => $this->lqd_price,
            'lqd_currency' => $this->lqd_currency,
            'lqd_unit_category' => $this->lqd_unit_category,
            'lqd_unit_slug' => $this->lqd_unit_slug,
            'lqd_total' => $this->lqd_total,
            'buying_unit_price' => $this->buying_unit_price,
            'buying_currency' => $this->buying_currency,
            'buying_unit_category' => $this->buying_unit_category,
            'buying_unit_slug' => $this->buying_unit_slug,
            'buying_total' => $this->buying_total,
            'buying_correction' => $this->buying_correction,
            'rebate_rate_packer' => $this->rebate_rate_packer,
            'rebate_rate_packer_currency' => $this->rebate_rate_packer_currency,
            'rebate_rate_packer_unit_category' => $this->rebate_rate_packer_unit_category,
            'rebate_rate_packer_unit_slug' => $this->rebate_rate_packer_unit_slug,
            'rebate_rate_packer_total' => $this->rebate_rate_packer_total,
            'rebate_rate_customer' => $this->rebate_rate_customer,
            'rebate_rate_customer_currency' => $this->rebate_rate_customer_currency,
            'rebate_rate_customer_unit_category' => $this->rebate_rate_customer_unit_category,
            'rebate_rate_customer_unit_slug' => $this->rebate_rate_customer_unit_slug,
            'rebate_rate_customer_total' => $this->rebate_rate_customer_total,
            'total_ctn_correction' => $this->total_ctn_correction,
            'total_nw_correction' => $this->total_nw_correction,
            'commission_from_packer' => $this->commission_from_packer,
            'commission_from_packer_unit_category' => $this->commission_from_packer_unit_category,
            'commission_from_packer_unit_slug' => $this->commission_from_packer_unit_slug,
            'total_packer_commission' => $this->total_packer_commission,
            'commission_from_customer' => $this->commission_from_customer,
            'commission_from_customer_unit_category' => $this->commission_from_customer_unit_category,
            'commission_from_customer_unit_slug' => $this->commission_from_customer_unit_slug,
            'total_customer_commission' => $this->total_customer_commission,
            'sort_order' => $this->sort_order,
            'created_at' => optional($this->created_at)->toJSON(),
            'updated_at' => optional($this->updated_at)->toJSON(),
        ];
    }
}
