<?php

namespace App\Http\Resources\Transactions;

use App\Enums\TransactionStatus;
use App\Models\User;
use App\Models\UsersEventLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Transaction */
final class TransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'booking_no' => $this->booking_no,
            'booking_mode' => $this->booking_mode,
            'issue_date' => optional($this->issue_date)->toDateString(),
            'sales_person_id' => $this->sales_person_id,
            'product_origin' => $this->product_origin,
            'destination' => $this->destination,
            'category' => $this->category,
            'type' => $this->type,
            'country' => $this->country,
            'container_primary' => $this->container_primary,
            'container_secondary' => $this->container_secondary,
            'certified' => $this->certified,
            'net_margin' => $this->net_margin,
            'status' => $this->status?->value ?? TransactionStatus::Unshipped->value,
            'created_by_user_id' => $this->created_by_user_id,
            'created_at' => optional($this->created_at)->toJSON(),
            'updated_at' => optional($this->updated_at)->toJSON(),
            'sales_person' => $this->whenLoaded('salesPerson'),
            'created_by' => $this->whenLoaded('createdBy'),
            'updated_by' => $this->lastModifiedBy(),
            'general_info_customer' => $this->whenLoaded('generalInfoCustomer'),
            'general_info_packer' => $this->whenLoaded('generalInfoPacker'),
            'revenue_customer' => $this->whenLoaded('revenueCustomer'),
            'revenue_packer' => $this->whenLoaded('revenuePacker'),
            'cash_flow_customer' => $this->whenLoaded(
                'cashFlowCustomer',
                fn () => $this->cashFlowCustomerPayload($this->cashFlowCustomer)
            ),
            'cash_flow_packer' => $this->whenLoaded(
                'cashFlowPacker',
                fn () => $this->cashFlowPackerPayload($this->cashFlowPacker)
            ),
            'shipping_details_customer' => $this->whenLoaded(
                'shippingDetailsCustomer',
                fn () => $this->shippingDetailsPayload($this->shippingDetailsCustomer)
            ),
            'shipping_details_packer' => $this->whenLoaded(
                'shippingDetailsPacker',
                fn () => $this->shippingDetailsPayload($this->shippingDetailsPacker)
            ),
            'notes' => $this->whenLoaded('note'),
            'logistics' => $this->whenLoaded('logistics'),
            'expense_lines' => $this->whenLoaded('expenseLines'),
            'note_entries' => $this->whenLoaded('noteEntries'),
            'items' => TransactionItemResource::collection($this->whenLoaded('items')),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function cashFlowCustomerPayload(mixed $cashFlow): ?array
    {
        if (! $cashFlow) {
            return null;
        }

        return [
            'id' => $cashFlow->id,
            'transaction_id' => $cashFlow->transaction_id,
            'date_advance' => $cashFlow->getRawOriginal('date_advance'),
            'amount_advance' => $cashFlow->amount_advance,
            'invoice_date' => $cashFlow->getRawOriginal('invoice_date'),
            'date_balance' => $cashFlow->getRawOriginal('date_balance'),
            'amount_balance' => $cashFlow->amount_balance,
            'created_at' => optional($cashFlow->created_at)->toJSON(),
            'updated_at' => optional($cashFlow->updated_at)->toJSON(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function cashFlowPackerPayload(mixed $cashFlow): ?array
    {
        if (! $cashFlow) {
            return null;
        }

        return [
            'id' => $cashFlow->id,
            'transaction_id' => $cashFlow->transaction_id,
            'date_advance' => $cashFlow->getRawOriginal('date_advance'),
            'amount_advance' => $cashFlow->amount_advance,
            'invoice_date' => $cashFlow->getRawOriginal('invoice_date'),
            'date_balance' => $cashFlow->getRawOriginal('date_balance'),
            'amount_balance' => $cashFlow->amount_balance,
            'created_at' => optional($cashFlow->created_at)->toJSON(),
            'updated_at' => optional($cashFlow->updated_at)->toJSON(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function shippingDetailsPayload(mixed $shippingDetails): ?array
    {
        if (! $shippingDetails) {
            return null;
        }

        return [
            'id' => $shippingDetails->id,
            'transaction_id' => $shippingDetails->transaction_id,
            'lsd_min' => $shippingDetails->getRawOriginal('lsd_min'),
            'lsd_max' => $shippingDetails->getRawOriginal('lsd_max'),
            'presentation_days' => $shippingDetails->presentation_days,
            'lc_expiry' => $shippingDetails->getRawOriginal('lc_expiry'),
            'req_eta' => $shippingDetails->getRawOriginal('req_eta'),
            'created_at' => optional($shippingDetails->created_at)->toJSON(),
            'updated_at' => optional($shippingDetails->updated_at)->toJSON(),
        ];
    }

    /**
     * @return array{id: int|null, name: string|null, email: string|null}|null
     */
    private function lastModifiedBy(): ?array
    {
        $event = $this->latestTransactionEvent([
            'Transaction updated',
            'Status updated',
        ])
            ?? $this->latestTransactionEvent(['Transaction created']);

        if ($event) {
            return [
                'id' => $event->user?->id ?? $event->user_id,
                'name' => $event->user?->name ?? $event->user_name,
                'email' => $event->user?->email,
            ];
        }

        $creator = $this->whenLoaded('createdBy');

        if ($creator instanceof User) {
            return [
                'id' => $creator->id,
                'name' => $creator->name,
                'email' => $creator->email,
            ];
        }

        return null;
    }

    /**
     * @param  list<string>  $actions
     */
    private function latestTransactionEvent(array $actions): ?UsersEventLog
    {
        return UsersEventLog::query()
            ->with('user:id,name,email')
            ->where('event_type', 'Transaction')
            ->where('data->record_id', $this->id)
            ->whereIn('data->action', $actions)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();
    }
}
