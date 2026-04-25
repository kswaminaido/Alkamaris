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
            'body_template' => $documentType === 'bcv_lqd' ? 'bcv_lqd' : 'default',
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
            'template' => $this->stringOrFallback(Arr::get($options, 'template'), 'India Private'),
            'approve_code' => $this->stringOrFallback(Arr::get($options, 'approve_code'), ''),
            'print_revised' => $this->stringOrFallback(Arr::get($options, 'print_revised'), 'NO'),
            'print_liquidation' => $this->stringOrFallback(Arr::get($options, 'print_liquidation'), 'NO'),
            'show_glazing' => $this->stringOrFallback(Arr::get($options, 'show_glazing'), 'Size'),
            'articles' => $this->articles($options),
            'attachments' => $this->attachments($options),
            'footer_note' => 'Alkamaris issues this order confirmation in its capacity as broker/agent and does not assume liability in the event of non-performance or default by the packer.',
            'footer_address' => "361/3, S V Raju Classsic Building, Morampudi, Rajahmundry, East Godavari, Andhra Pradesh, India-533107",
            'bcv' => $this->bcvLqdData($transaction, $options),
        ];
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    private function bcvLqdData(Transaction $transaction, array $options): array
    {
        $customer = $transaction->generalInfoCustomer;
        $packer = $transaction->generalInfoPacker;
        $revenueCustomer = $transaction->revenueCustomer;
        $shippingCustomer = $transaction->shippingDetailsCustomer;
        $shippingPacker = $transaction->shippingDetailsPacker;
        $logistics = $transaction->logistics;
        $items = $transaction->items ?? collect();

        $productItems = $items
            ->map(fn (mixed $item): array => $this->bcvLqdItem($item))
            ->values()
            ->all();

        $amountValues = collect($productItems)
            ->pluck('amount_value')
            ->filter(fn (mixed $value): bool => $value !== null);
        $totalAmount = $amountValues->isEmpty() ? null : $amountValues->sum();

        return [
            'date' => Carbon::now()->format('M d, Y'),
            'booking_reference' => trim(($transaction->booking_no ?? '') . ' - ' . $this->formatDate($transaction->issue_date), ' -'),
            'fax' => '',
            'to' => $this->displayText($customer?->customer),
            'attention' => $this->displayText($customer?->attention),
            'items' => $productItems,
            'total_amount' => $this->moneyOrBlank($totalAmount),
            'total_amount_currency' => $this->currencyTotalLabel($this->firstProductItemValue($productItems, 'amount_currency')),
            'price_basis' => $this->priceBasis($customer?->prices_customer_type, $logistics?->port ?: $logistics?->destination ?: $transaction->destination),
            'payment_terms' => $this->bcvPaymentTerms(
                $customer?->payment_customer_type,
                $customer?->payment_customer_advance_percent,
                Arr::get($options, 'payment_advance'),
                $customer?->payment_customer_term,
            ),
            'tolerance' => $this->displayText($customer?->tolerance),
            'latest_shipment_date' => $this->formatDisplayDate($shippingCustomer?->lsd_max ?: $shippingPacker?->lsd_max),
            'packer' => $this->upperText($packer?->packer_name),
            'commission' => $this->commissionText($revenueCustomer?->commission_enabled, $revenueCustomer?->commission_percent),
            'destination' => $this->upperText($logistics?->destination ?: $transaction->destination),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function bcvLqdItem(mixed $item): array
    {
        $quantity = $this->firstNumber($item?->qty_booking, $item?->qty_value);
        $line = $this->bcvLqdLineValues($item, $quantity);

        return [
            'product' => $this->upperText($item?->product),
            'style' => $this->upperText($item?->style),
            'packing' => $this->displayText($item?->packing),
            'brand' => $this->upperText($item?->brand),
            'notes' => $this->displayText($item?->notes),
            'size' => $this->displayText($item?->size),
            'cartons' => $this->quantityOrBlank($quantity),
            'price' => $this->decimalOrBlank($line['price'], 3),
            'amount' => $this->moneyOrBlank($line['amount']),
            'amount_value' => $line['amount'],
            'amount_currency' => $line['currency'],
            'price_header' => $this->priceHeader($line['currency'], $line['unit']),
            'amount_header' => $this->amountHeader($line['currency']),
        ];
    }

    /**
     * @return array{price: float|null, amount: float|null, currency: string, unit: string}
     */
    private function bcvLqdLineValues(mixed $item, ?float $quantity): array
    {
        return $this->itemLineValues(
            $item?->lqd_price,
            $item?->lqd_total,
            $item?->lqd_currency,
            $item?->lqd_unit_slug,
            $quantity,
        ) ?? $this->itemLineValues(
            $item?->selling_unit_price,
            $item?->selling_total,
            $item?->selling_currency,
            $item?->selling_unit_slug,
            $quantity,
        ) ?? [
            'price' => null,
            'amount' => null,
            'currency' => '',
            'unit' => '',
        ];
    }

    /**
     * @return array{price: float|null, amount: float|null, currency: string, unit: string}|null
     */
    private function itemLineValues(mixed $priceValue, mixed $amountValue, mixed $currencyValue, mixed $unitValue, ?float $quantity): ?array
    {
        $price = $this->numberOrNull($priceValue);
        $amount = $this->numberOrNull($amountValue);

        if ($price === null && ($amount === null || $this->isZero($amount))) {
            return null;
        }

        if ($price !== null && ($amount === null || ($this->isZero($amount) && ! $this->isZero($price) && $quantity !== null && ! $this->isZero($quantity)))) {
            $amount = $quantity !== null ? $price * $quantity : null;
        }

        return [
            'price' => $price,
            'amount' => $amount,
            'currency' => $this->displayText($currencyValue),
            'unit' => $this->displayUnit($unitValue),
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
            ->pad(5, '')
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

    private function moneyOrBlank(float|int|string|null $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return $this->money($value);
    }

    private function decimalOrBlank(float|int|string|null $value, int $decimals): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return number_format((float) $value, $decimals, '.', ',');
    }

    private function quantityOrBlank(float|int|string|null $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $number = (float) $value;
        $decimals = floor($number) === $number ? 0 : 2;

        return number_format($number, $decimals, '.', ',');
    }

    private function firstNumber(mixed ...$values): ?float
    {
        foreach ($values as $value) {
            $number = $this->numberOrNull($value);

            if ($number !== null) {
                return $number;
            }
        }

        return null;
    }

    private function numberOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }

    private function isZero(float|int $value): bool
    {
        return abs((float) $value) < 0.00001;
    }

    private function displayText(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private function displayUnit(mixed $value): string
    {
        $unit = $this->displayText($value);

        return is_numeric($unit) ? '' : $unit;
    }

    private function upperText(mixed $value): string
    {
        return Str::upper($this->displayText($value));
    }

    private function formatDisplayDate(mixed $value): string
    {
        if (! $value) {
            return '';
        }

        try {
            return Carbon::parse($value)->format('M d, Y');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function firstProductItemValue(array $items, string $field): string
    {
        foreach ($items ?? [] as $item) {
            $value = $this->displayText($item[$field] ?? null);

            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function priceBasis(mixed $priceType, mixed $place): string
    {
        return trim(Str::upper($this->displayText($priceType) . ' ' . $this->displayText($place)));
    }

    private function bcvPaymentTerms(mixed $paymentType, mixed $advancePercent, mixed $optionAdvance, mixed $balanceTerm): string
    {
        $parts = [];
        $type = $this->displayText($paymentType);
        $advance = $this->displayText($optionAdvance);
        $balance = $this->displayText($balanceTerm);

        if ($advance === '' && $advancePercent !== null && $advancePercent !== '') {
            $advance = $this->quantityOrBlank($advancePercent) . ' % DEPOSIT';
        }

        if ($type !== '') {
            $parts[] = $type;
        }

        if ($advance !== '') {
            $parts[] = $advance;
        }

        if ($balance !== '') {
            $parts[] = $advance !== '' ? 'AND BALANCE ' . $balance : $balance;
        }

        return Str::upper(implode(' ', $parts));
    }

    private function commissionText(mixed $enabled, mixed $percent): string
    {
        if (! $enabled) {
            return 'NO COMMISSION';
        }

        $formattedPercent = $this->quantityOrBlank($percent);

        return $formattedPercent !== '' ? "{$formattedPercent} % COMMISSION" : 'COMMISSION';
    }

    private function priceHeader(string $currency, string $unit): string
    {
        $label = $this->currencyRateLabel($currency);

        if ($unit !== '') {
            return trim("Price {$label}/{$unit}");
        }

        return trim("Price {$label}");
    }

    private function amountHeader(string $currency): string
    {
        $label = $this->currencyTotalLabel($currency);

        return trim("Amount {$label}");
    }

    private function currencyRateLabel(string $currency): string
    {
        return match (Str::upper($currency)) {
            'USD' => 'US$',
            '' => '',
            default => Str::upper($currency),
        };
    }

    private function currencyTotalLabel(string $currency): string
    {
        return match (Str::upper($currency)) {
            'USD' => 'US$',
            '' => '',
            default => Str::upper($currency),
        };
    }

    private function stringOrFallback(mixed $value, string $fallback): string
    {
        $text = trim((string) $value);

        return $text !== '' ? $text : $fallback;
    }
}
