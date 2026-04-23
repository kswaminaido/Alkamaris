<?php

namespace App\Services\Transactions;

use App\Models\Transaction;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

final class TransactionDocumentViewDataFactory
{
    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function build(Transaction $transaction, string $documentType, array $options, string $label): array
    {
        $customer = $transaction->generalInfoCustomer;
        $packer = $transaction->generalInfoPacker;
        $revenueCustomer = $transaction->revenueCustomer;
        $revenuePacker = $transaction->revenuePacker;
        $shippingPacker = $transaction->shippingDetailsPacker;
        $logistics = $transaction->logistics;
        $notes = $transaction->note;

        $renderDate = Carbon::now()->format('M d, Y');
        $transactionDate = $this->formatDate($transaction->issue_date);
        $port = strtoupper((string) ($logistics?->port ?: $transaction->destination ?: 'AQABA PORT, JORDAN'));

        return [
            'type' => $documentType,
            'label' => $label,
            'file_stem' => Str::slug(($transaction->booking_no ?: 'transaction') . '-' . $documentType),
            'company' => 'Alkamaris',
            'header_company' => 'Alkamaris Exports Pvt Ltd',
            'header_tagline' => 'Sourced with care, Delivered with Trust',
            'logo_path' => public_path('images/alkamaris-logo.png'),
            'title' => $documentType === 'delivery_order' ? 'DELIVERY ORDER' : 'ORDER CONFIRMATION',
            'transaction_date' => $transactionDate,
            'render_date' => $renderDate,
            'order_reference' => trim(($transaction->booking_no ?? 'SIN2605802') . ' - ' . $transactionDate, ' -'),
            'buyer' => strtoupper((string) ($customer?->customer ?: 'LEADER FOOD SUPPLY INSTITUTION')),
            'attention' => strtoupper((string) ($customer?->attention ?: 'MR. YOUSEF AZIZ')),
            'product_title' => strtoupper((string) ($revenueCustomer?->description ?: $revenuePacker?->description ?: 'FROZEN VANNAMEI WHITE SHRIMP')),
            'product_style' => strtoupper((string) ($transaction->type ?: 'RAW PEELED & DEVEINED TAIL ON')),
            'packing' => strtoupper((string) ($transaction->container_primary ?: '10 x 1 KG(S) IQF')),
            'brand' => strtoupper((string) ($packer?->vendor ?: 'PLAIN+HEADER CARD')),
            'notes' => strtoupper((string) ($notes?->by_sales ?: '35% GLAZE FROZEN WEIGHT & FROZEN COUNT. EU STANDARD TREATMENT')),
            'rows' => $this->rows($customer),
            'amount_total' => $this->money(119300),
            'price_basis' => strtoupper((string) ($customer?->prices_customer_type ?: 'CFR')) . ' ' . $port,
            'payment_terms' => $this->paymentTerms($customer?->payment_customer_advance_percent, $options),
            'latest_shipment_date' => strtoupper((string) ($this->formatDate($shippingPacker?->lsd_max) ?: 'FEB 28, 2026')),
            'packer' => strtoupper((string) ($packer?->packer_name ?: 'CONTAI MARINE FISH EXPORT PRIVATE LIMITED')),
            'destination' => strtoupper((string) ($logistics?->destination ?: $transaction->destination ?: 'AQABA, JORDAN')),
            'template' => $this->stringOrFallback(Arr::get($options, 'template'), 'India'),
            'approve_code' => $this->stringOrFallback(Arr::get($options, 'approve_code'), 'ALKA-APR-01'),
            'print_revised' => $this->stringOrFallback(Arr::get($options, 'print_revised'), 'No'),
            'print_liquidation' => $this->stringOrFallback(Arr::get($options, 'print_liquidation'), 'No'),
            'show_glazing' => $this->stringOrFallback(Arr::get($options, 'show_glazing'), 'Size'),
            'articles' => $this->articles($options),
            'attachments' => $this->attachments($options),
            'footer_note' => 'Alkamaris issues this order confirmation in its capacity as broker/agent and does not assume liability in the event of non-performance or default by the packer.',
            'footer_address' => "361/3, S V Raju Classsic Building, Morampudi, Rajahmundry, East Godavari, Andhra Pradesh, India-533107",
        ];
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function rows(mixed $customer): array
    {
        return [
            ['size' => '8/12', 'cartons' => '1,000', 'price' => $this->money($customer?->prices_customer_rate ?: 6.45), 'amount' => $this->money(64500)],
            ['size' => '11/15', 'cartons' => '1,000', 'price' => $this->money(($customer?->prices_customer_rate ?: 5.48) - 0.97), 'amount' => $this->money(54800)],
        ];
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<int, string>
     */
    private function articles(array $options): array
    {
        return collect(Arr::get($options, 'articles', []))
            ->map(fn(mixed $article): string => trim((string) $article))
            ->filter()
            ->values()
            ->pad(6, '')
            ->all();
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<int, string>
     */
    private function attachments(array $options): array
    {
        return collect(Arr::get($options, 'attachments', []))
            ->map(fn(mixed $value): string => trim((string) $value))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $options
     */
    private function paymentTerms(mixed $advancePercent, array $options): string
    {
        $paymentAdvance = $this->stringOrFallback(
            Arr::get($options, 'payment_advance'),
            $advancePercent ? $advancePercent . '% DEPOSIT' : '30% DEPOSIT',
        );

        return strtoupper(trim("T/T   {$paymentAdvance} AND BALANCE AGAINST SHIPPING DOCUMENTS COPY VIA EMAIL"));
    }

    private function formatDate(mixed $value): string
    {
        if (! $value) {
            return '';
        }

        try {
            return Carbon::parse($value)->format('d/m/Y');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    private function money(float|int|string|null $value): string
    {
        return number_format((float) $value, 2, '.', ',');
    }

    private function stringOrFallback(mixed $value, string $fallback): string
    {
        $text = trim((string) $value);

        return $text !== '' ? $text : $fallback;
    }
}
