<?php

namespace App\Http\Requests\Transactions;

use App\Models\Transaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class TransactionPayloadRequest extends FormRequest
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
        return array_merge(
            $this->transactionRules(),
            $this->generalInfoCustomerRules(),
            $this->generalInfoPackerRules(),
            $this->revenueCustomerRules(),
            $this->revenuePackerRules(),
            $this->shippingRules(),
            $this->notesAndLogisticsRules(),
            $this->collectionRules(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function transactionRules(): array
    {
        return [
            'transaction' => ['required', 'array'],
            'transaction.booking_no' => $this->bookingNoRules(),
            'transaction.booking_mode' => ['required', 'string', Rule::in(['trade_commission', 'qc_services'])],
            'transaction.issue_date' => ['nullable', 'date'],
            'transaction.sales_person_id' => ['nullable', 'integer', 'exists:users,id'],
            'transaction.product_origin' => ['nullable', 'string', 'max:255'],
            'transaction.destination' => ['nullable', 'string', 'max:255'],
            'transaction.category' => ['nullable', 'string', 'max:255'],
            'transaction.type' => ['nullable', 'string', 'max:255'],
            'transaction.country' => ['nullable', 'string', 'max:255'],
            'transaction.container_primary' => ['nullable', 'string', 'max:255'],
            'transaction.container_secondary' => ['nullable', 'string', 'max:255'],
            'transaction.certified' => ['nullable', 'boolean'],
            'transaction.net_margin' => ['nullable', 'numeric'],
            'transaction.status' => ['nullable', 'string', Rule::in(['I', 'P', 'S', 'R', 'U', 'T'])],
        ];
    }

    /**
     * @return array<int, mixed>
     */
    protected function bookingNoRules(): array
    {
        return ['required', 'string', 'max:100', $this->bookingNoRule()];
    }

    protected function bookingNoRule()
    {
        $transaction = $this->route('transaction');
        $rule = Rule::unique('transactions', 'booking_no');

        if ($transaction instanceof Transaction) {
            $rule = $rule->ignore($transaction->id);
        }

        return $rule;
    }

    /**
     * @return array<string, mixed>
     */
    private function generalInfoCustomerRules(): array
    {
        return [
            'general_info_customer' => ['nullable', 'array'],
            'general_info_customer.customer' => ['nullable', 'string', 'max:255'],
            'general_info_customer.attention' => ['nullable', 'string', 'max:255'],
            'general_info_customer.ship_to' => ['nullable', 'string', 'max:255'],
            'general_info_customer.buyer' => ['nullable', 'string', 'max:255'],
            'general_info_customer.buyer_number' => ['nullable', 'string', 'max:255'],
            'general_info_customer.end_customer' => ['nullable', 'string', 'max:255'],
            'general_info_customer.prices_customer_type' => ['nullable', 'string', 'max:255'],
            'general_info_customer.prices_customer_rate' => ['nullable', 'numeric'],
            'general_info_customer.payment_customer_term' => ['nullable', 'string', 'max:255'],
            'general_info_customer.payment_customer_type' => ['nullable', 'string', 'max:255'],
            'general_info_customer.payment_customer_advance_percent' => ['nullable', 'numeric'],
            'general_info_customer.description' => ['nullable', 'string'],
            'general_info_customer.tolerance' => ['nullable', 'string', 'max:255'],
            'general_info_customer.marketing_fee' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function generalInfoPackerRules(): array
    {
        return [
            'general_info_packer' => ['nullable', 'array'],
            'general_info_packer.vendor' => ['nullable', 'string', 'max:255'],
            'general_info_packer.packer_name' => ['nullable', 'string', 'max:255'],
            'general_info_packer.packer_number' => ['nullable', 'string', 'max:255'],
            'general_info_packer.packed_by' => ['nullable', 'string', 'max:255'],
            'general_info_packer.prices_packer_type' => ['nullable', 'string', 'max:255'],
            'general_info_packer.prices_packer_rate' => ['nullable', 'numeric'],
            'general_info_packer.payment_packer_term' => ['nullable', 'string', 'max:255'],
            'general_info_packer.payment_packer_type' => ['nullable', 'string', 'max:255'],
            'general_info_packer.payment_packer_advance_percent' => ['nullable', 'numeric'],
            'general_info_packer.description' => ['nullable', 'string'],
            'general_info_packer.tolerance' => ['nullable', 'string', 'max:255'],
            'general_info_packer.total_lqd_price' => ['nullable', 'numeric'],
            'general_info_packer.consignee' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function revenueCustomerRules(): array
    {
        return [
            'revenue_customer' => ['nullable', 'array'],
            'revenue_customer.total_selling_value' => ['nullable', 'numeric'],
            'revenue_customer.total_selling_currency' => ['nullable', 'string', 'max:50'],
            'revenue_customer.commission_enabled' => ['nullable', 'boolean'],
            'revenue_customer.commission_percent' => ['nullable', 'numeric'],
            'revenue_customer.amount' => ['nullable', 'numeric'],
            'revenue_customer.amount_currency' => ['nullable', 'string', 'max:50'],
            'revenue_customer.description' => ['nullable', 'string'],
            'revenue_customer.rebate_memo_amount' => ['nullable', 'numeric'],
            'revenue_customer.rebate_memo_description' => ['nullable', 'string', 'max:255'],
            'revenue_customer.overcharge_sc_amount' => ['nullable', 'numeric'],
            'revenue_customer.overcharge_sc_description' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function revenuePackerRules(): array
    {
        return [
            'revenue_packer' => ['nullable', 'array'],
            'revenue_packer.total_buying_value' => ['nullable', 'numeric'],
            'revenue_packer.total_buying_currency' => ['nullable', 'string', 'max:50'],
            'revenue_packer.commission_enabled' => ['nullable', 'boolean'],
            'revenue_packer.commission_percent' => ['nullable', 'numeric'],
            'revenue_packer.amount' => ['nullable', 'numeric'],
            'revenue_packer.amount_currency' => ['nullable', 'string', 'max:50'],
            'revenue_packer.description' => ['nullable', 'string'],
            'revenue_packer.overcharge_sc_amount' => ['nullable', 'numeric'],
            'revenue_packer.overcharge_sc_description' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function shippingRules(): array
    {
        return [
            'shipping_details_customer' => ['nullable', 'array'],
            'shipping_details_customer.lsd_min' => ['nullable', 'date'],
            'shipping_details_customer.lsd_max' => ['nullable', 'date'],
            'shipping_details_customer.presentation_days' => ['nullable', 'integer'],
            'shipping_details_customer.lc_expiry' => ['nullable', 'date'],
            'shipping_details_customer.req_eta' => ['nullable', 'date'],
            'shipping_details_packer' => ['nullable', 'array'],
            'shipping_details_packer.lsd_min' => ['nullable', 'date'],
            'shipping_details_packer.lsd_max' => ['nullable', 'date'],
            'shipping_details_packer.presentation_days' => ['nullable', 'integer'],
            'shipping_details_packer.lc_expiry' => ['nullable', 'date'],
            'shipping_details_packer.req_eta' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function notesAndLogisticsRules(): array
    {
        return [
            'notes' => ['nullable', 'array'],
            'notes.by_sales' => ['nullable', 'string'],
            'logistics' => ['nullable', 'array'],
            'logistics.plan_etd' => ['nullable', 'date'],
            'logistics.plan_eta' => ['nullable', 'date'],
            'logistics.packaging_date_inner' => ['nullable', 'date'],
            'logistics.packaging_date_outer' => ['nullable', 'date'],
            'logistics.packaging_date_approved' => ['nullable', 'date'],
            'logistics.feeder_vessel' => ['nullable', 'string', 'max:255'],
            'logistics.mother_vessel' => ['nullable', 'string', 'max:255'],
            'logistics.container_no' => ['nullable', 'string', 'max:255'],
            'logistics.seal_no' => ['nullable', 'string', 'max:255'],
            'logistics.lc_no' => ['nullable', 'string', 'max:255'],
            'logistics.temperature_recorder_no' => ['nullable', 'string', 'max:255'],
            'logistics.temperature_recorder_location_row_no' => ['nullable', 'string', 'max:255'],
            'logistics.etd_date' => ['nullable', 'date'],
            'logistics.eta_date' => ['nullable', 'date'],
            'logistics.qc_inspection_date' => ['nullable', 'date'],
            'logistics.discharge' => ['nullable', 'string', 'max:255'],
            'logistics.at' => ['nullable', 'string', 'max:255'],
            'logistics.discharge_at' => ['nullable', 'string', 'max:255'],
            'logistics.service_type' => ['nullable', 'string', 'max:255'],
            'logistics.bl_date' => ['nullable', 'date'],
            'logistics.bl_no' => ['nullable', 'string', 'max:255'],
            'logistics.port' => ['nullable', 'string', 'max:255'],
            'logistics.destination' => ['nullable', 'string', 'max:255'],
            'logistics.shipping_line_agent' => ['nullable', 'string', 'max:255'],
            'logistics.sc_inv_to_customer' => ['nullable', 'string', 'max:255'],
            'logistics.packer_inv_date' => ['nullable', 'date'],
            'logistics.packer_inv' => ['nullable', 'string', 'max:255'],
            'logistics.cancel_claim' => ['nullable', 'boolean'],
            'logistics.cancel_reject' => ['nullable', 'boolean'],
            'logistics.cancel_move' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function collectionRules(): array
    {
        return [
            'expense_lines' => ['nullable', 'array'],
            'expense_lines.*.section' => ['required_with:expense_lines', 'string', 'max:50'],
            'expense_lines.*.group_name' => ['nullable', 'string', 'max:100'],
            'expense_lines.*.line_key' => ['required_with:expense_lines', 'string', 'max:100'],
            'expense_lines.*.line_label' => ['nullable', 'string', 'max:120'],
            'expense_lines.*.amount' => ['nullable', 'numeric'],
            'expense_lines.*.currency' => ['nullable', 'string', 'max:50'],
            'expense_lines.*.description' => ['nullable', 'string', 'max:255'],
            'expense_lines.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'note_entries' => ['nullable', 'array'],
            'note_entries.*.section' => ['nullable', 'string', 'max:50'],
            'note_entries.*.note_key' => ['required_with:note_entries', 'string', 'max:100'],
            'note_entries.*.note_value' => ['nullable', 'string'],
            'note_entries.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'items' => ['nullable', 'array'],
            'items.*.product' => ['nullable', 'string', 'max:255'],
            'items.*.style' => ['nullable', 'string', 'max:255'],
            'items.*.packing' => ['nullable', 'string', 'max:255'],
            'items.*.media' => ['nullable', 'string', 'max:255'],
            'items.*.notes' => ['nullable', 'string'],
            'items.*.brand' => ['nullable', 'string', 'max:255'],
            'items.*.secondary_packaging' => ['nullable', 'string', 'max:255'],
            'items.*.item_code' => ['nullable', 'string', 'max:255'],
            'items.*.customer_lot_no' => ['nullable', 'string', 'max:255'],
            'items.*.size' => ['nullable', 'string', 'max:255'],
            'items.*.glaze_percentage' => ['nullable', 'numeric'],
            'items.*.total_weight_value' => ['nullable', 'numeric'],
            'items.*.total_weight_unit_category' => ['nullable', 'string', 'max:50'],
            'items.*.total_weight_unit_slug' => ['nullable', 'string', 'max:100'],
            'items.*.qty_value' => ['nullable', 'numeric'],
            'items.*.qty_unit' => ['nullable', 'string', 'max:50'],
            'items.*.qty_booking' => ['nullable', 'numeric'],
            'items.*.selling_unit_price' => ['nullable', 'numeric'],
            'items.*.selling_currency' => ['nullable', 'string', 'max:20'],
            'items.*.selling_unit_category' => ['nullable', 'string', 'max:50'],
            'items.*.selling_unit_slug' => ['nullable', 'string', 'max:100'],
            'items.*.selling_total' => ['nullable', 'numeric'],
            'items.*.selling_correction' => ['nullable', 'numeric'],
            'items.*.lqd_qty' => ['nullable', 'numeric'],
            'items.*.lqd_price' => ['nullable', 'numeric'],
            'items.*.lqd_currency' => ['nullable', 'string', 'max:20'],
            'items.*.lqd_unit_category' => ['nullable', 'string', 'max:50'],
            'items.*.lqd_unit_slug' => ['nullable', 'string', 'max:100'],
            'items.*.lqd_total' => ['nullable', 'numeric'],
            'items.*.buying_unit_price' => ['nullable', 'numeric'],
            'items.*.buying_currency' => ['nullable', 'string', 'max:20'],
            'items.*.buying_unit_category' => ['nullable', 'string', 'max:50'],
            'items.*.buying_unit_slug' => ['nullable', 'string', 'max:100'],
            'items.*.buying_total' => ['nullable', 'numeric'],
            'items.*.buying_correction' => ['nullable', 'numeric'],
            'items.*.rebate_rate_packer' => ['nullable', 'numeric'],
            'items.*.rebate_rate_packer_currency' => ['nullable', 'string', 'max:20'],
            'items.*.rebate_rate_packer_unit_category' => ['nullable', 'string', 'max:50'],
            'items.*.rebate_rate_packer_unit_slug' => ['nullable', 'string', 'max:100'],
            'items.*.rebate_rate_packer_total' => ['nullable', 'numeric'],
            'items.*.rebate_rate_customer' => ['nullable', 'numeric'],
            'items.*.rebate_rate_customer_currency' => ['nullable', 'string', 'max:20'],
            'items.*.rebate_rate_customer_unit_category' => ['nullable', 'string', 'max:50'],
            'items.*.rebate_rate_customer_unit_slug' => ['nullable', 'string', 'max:100'],
            'items.*.rebate_rate_customer_total' => ['nullable', 'numeric'],
            'items.*.total_ctn_correction' => ['nullable', 'numeric'],
            'items.*.total_nw_correction' => ['nullable', 'numeric'],
            'items.*.commission_from_packer' => ['nullable', 'numeric'],
            'items.*.commission_from_packer_unit_category' => ['nullable', 'string', 'max:50'],
            'items.*.commission_from_packer_unit_slug' => ['nullable', 'string', 'max:100'],
            'items.*.total_packer_commission' => ['nullable', 'numeric'],
            'items.*.commission_from_customer' => ['nullable', 'numeric'],
            'items.*.commission_from_customer_unit_category' => ['nullable', 'string', 'max:50'],
            'items.*.commission_from_customer_unit_slug' => ['nullable', 'string', 'max:100'],
            'items.*.total_customer_commission' => ['nullable', 'numeric'],
            'items.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
