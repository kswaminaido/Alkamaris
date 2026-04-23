<?php

namespace App\Http\Resources\Transactions;

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
            'created_by_user_id' => $this->created_by_user_id,
            'created_at' => optional($this->created_at)->toJSON(),
            'updated_at' => optional($this->updated_at)->toJSON(),
            'sales_person' => $this->whenLoaded('salesPerson'),
            'created_by' => $this->whenLoaded('createdBy'),
            'general_info_customer' => $this->whenLoaded('generalInfoCustomer'),
            'general_info_packer' => $this->whenLoaded('generalInfoPacker'),
            'revenue_customer' => $this->whenLoaded('revenueCustomer'),
            'revenue_packer' => $this->whenLoaded('revenuePacker'),
            'shipping_details_customer' => $this->whenLoaded('shippingDetailsCustomer'),
            'shipping_details_packer' => $this->whenLoaded('shippingDetailsPacker'),
            'notes' => $this->whenLoaded('note'),
            'logistics' => $this->whenLoaded('logistics'),
            'expense_lines' => $this->whenLoaded('expenseLines'),
            'note_entries' => $this->whenLoaded('noteEntries'),
            'items' => TransactionItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
