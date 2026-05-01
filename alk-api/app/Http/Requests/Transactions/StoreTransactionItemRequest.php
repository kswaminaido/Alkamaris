<?php

namespace App\Http\Requests\Transactions;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransactionItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->itemRules('item');
    }

    /**
     * @return array<string, mixed>
     */
    protected function itemRules(string $prefix): array
    {
        return [
            $prefix => ['required', 'array'],
            "{$prefix}.product" => ['nullable', 'string', 'max:255'],
            "{$prefix}.style" => ['nullable', 'string', 'max:255'],
            "{$prefix}.packing" => ['nullable', 'string', 'max:255'],
            "{$prefix}.media" => ['nullable', 'string', 'max:255'],
            "{$prefix}.notes" => ['nullable', 'string'],
            "{$prefix}.brand" => ['nullable', 'string', 'max:255'],
            "{$prefix}.secondary_packaging" => ['nullable', 'string', 'max:255'],
            "{$prefix}.item_code" => ['nullable', 'string', 'max:255'],
            "{$prefix}.customer_lot_no" => ['nullable', 'string', 'max:255'],
            "{$prefix}.size" => ['nullable', 'string', 'max:255'],
            "{$prefix}.glaze_percentage" => ['nullable', 'numeric'],
            "{$prefix}.total_weight_value" => ['nullable', 'numeric'],
            "{$prefix}.total_weight_unit_category" => ['nullable', 'string', 'max:50'],
            "{$prefix}.total_weight_unit_slug" => ['nullable', 'string', 'max:100'],
            "{$prefix}.qty_value" => ['nullable', 'numeric'],
            "{$prefix}.qty_unit" => ['nullable', 'string', 'max:50'],
            "{$prefix}.qty_booking" => ['nullable', 'numeric'],
            "{$prefix}.selling_unit_price" => ['nullable', 'numeric'],
            "{$prefix}.selling_currency" => ['nullable', 'string', 'max:20'],
            "{$prefix}.selling_unit_category" => ['nullable', 'string', 'max:50'],
            "{$prefix}.selling_unit_slug" => ['nullable', 'string', 'max:100'],
            "{$prefix}.selling_total" => ['nullable', 'numeric'],
            "{$prefix}.selling_correction" => ['nullable', 'numeric'],
            "{$prefix}.lqd_qty" => ['nullable', 'numeric'],
            "{$prefix}.lqd_price" => ['nullable', 'numeric'],
            "{$prefix}.lqd_currency" => ['nullable', 'string', 'max:20'],
            "{$prefix}.lqd_unit_category" => ['nullable', 'string', 'max:50'],
            "{$prefix}.lqd_unit_slug" => ['nullable', 'string', 'max:100'],
            "{$prefix}.lqd_total" => ['nullable', 'numeric'],
            "{$prefix}.buying_unit_price" => ['nullable', 'numeric'],
            "{$prefix}.buying_currency" => ['nullable', 'string', 'max:20'],
            "{$prefix}.buying_unit_category" => ['nullable', 'string', 'max:50'],
            "{$prefix}.buying_unit_slug" => ['nullable', 'string', 'max:100'],
            "{$prefix}.buying_total" => ['nullable', 'numeric'],
            "{$prefix}.buying_correction" => ['nullable', 'numeric'],
            "{$prefix}.rebate_rate_packer" => ['nullable', 'numeric'],
            "{$prefix}.rebate_rate_packer_currency" => ['nullable', 'string', 'max:20'],
            "{$prefix}.rebate_rate_packer_unit_category" => ['nullable', 'string', 'max:50'],
            "{$prefix}.rebate_rate_packer_unit_slug" => ['nullable', 'string', 'max:100'],
            "{$prefix}.rebate_rate_packer_total" => ['nullable', 'numeric'],
            "{$prefix}.rebate_rate_customer" => ['nullable', 'numeric'],
            "{$prefix}.rebate_rate_customer_currency" => ['nullable', 'string', 'max:20'],
            "{$prefix}.rebate_rate_customer_unit_category" => ['nullable', 'string', 'max:50'],
            "{$prefix}.rebate_rate_customer_unit_slug" => ['nullable', 'string', 'max:100'],
            "{$prefix}.rebate_rate_customer_total" => ['nullable', 'numeric'],
            "{$prefix}.total_ctn_correction" => ['nullable', 'numeric'],
            "{$prefix}.total_nw_correction" => ['nullable', 'numeric'],
            "{$prefix}.commission_from_packer" => ['nullable', 'numeric'],
            "{$prefix}.commission_from_packer_unit_category" => ['nullable', 'string', 'max:50'],
            "{$prefix}.commission_from_packer_unit_slug" => ['nullable', 'string', 'max:100'],
            "{$prefix}.total_packer_commission" => ['nullable', 'numeric'],
            "{$prefix}.commission_from_customer" => ['nullable', 'numeric'],
            "{$prefix}.commission_from_customer_unit_category" => ['nullable', 'string', 'max:50'],
            "{$prefix}.commission_from_customer_unit_slug" => ['nullable', 'string', 'max:100'],
            "{$prefix}.total_customer_commission" => ['nullable', 'numeric'],
            "{$prefix}.sort_order" => ['nullable', 'integer', 'min:0'],
        ];
    }
}
