<?php

namespace App\Services\Transactions;

use App\Enums\UserRole;
use App\Models\Transaction;
use App\Models\User;
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
            'body_template' => $this->bodyTemplate($documentType),
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
            'footer_note' => $documentType === 'bcv_lqd'
                ? 'Alkamaris issues this Order confirmation in its capacity as broker/agent and does not assume liability in the event of non-performance or default by the buyer.'
                : 'Alkamaris issues this order confirmation in its capacity as broker/agent and does not assume liability in the event of non-performance or default by the packer.',
            'footer_address' => "361/3, S V Raju Classsic Building, Morampudi, Rajahmundry, East Godavari, Andhra Pradesh, India-533107",
            'bcv' => $this->bcvLqdData($transaction, $options),
        ];
    }

    private function bodyTemplate(string $documentType): string
    {
        return match ($documentType) {
            'bcb_lqd' => 'bcb-lqd',
            'bcv_lqd' => 'bcv-lqd',
            'sales_contract_packer' => 'sales-contract-packer',
            'appendix_packer' => 'appendix-packer',
            'proforma_invoice' => 'proforma-invoice',
            'specs' => 'specs',
            's_a' => 's-a',
            'lc_terms_vendor' => 'lc-terms-vendor',
            'lc_terms' => 'lc-terms',
            'delivery_order' => 'delivery-order',
            default => 'preview',
        };
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
        $cartonValues = collect($productItems)
            ->pluck('cartons_value')
            ->filter(fn (mixed $value): bool => $value !== null);
        $weightValues = collect($productItems)
            ->pluck('weight_value')
            ->filter(fn (mixed $value): bool => $value !== null);
        $firstCurrency = $this->firstProductItemValue($productItems, 'amount_currency');
        $firstCommission = collect($productItems)
            ->pluck('commission')
            ->first(fn (string $value): bool => $value !== '');

        return [
            'company_legal_name' => 'ALKAMARIS EXPORTS (OPC) PRIVATE LIMITED',
            'company_address_lines' => [
                'ALKAMARIS EXPORTS (OPC) Pvt Ltd',
                'RS 361/3,SV Raju Classic Building,Morampudi, Rajahmundry,',
                'East Godavari Dist,Andhra Pradesh',
                'India- 533107',
                'Ph: 91-9182284173',
            ],
            'contact_line' => 'Manasa - accounts@alkamarisexports.com (+91-9182284173)',
            'date' => $this->formatDotDate($transaction->issue_date ?: Carbon::now()),
            'booking_reference' => trim(($transaction->booking_no ?? '') . ' - ' . $this->formatDate($transaction->issue_date), ' -'),
            'order_confirmation_no' => $this->displayText($transaction->booking_no),
            'fax' => '',
            'to' => $this->displayText($customer?->customer),
            'attention' => $this->displayText($customer?->attention),
            'packer_block' => $this->partyBlock(
                $this->firstFilled($packer?->packer_name, $packer?->vendor),
                UserRole::Vendor->value,
                'GSTIN NO',
                $packer?->packer_number,
            ),
            'customer_block' => $this->partyBlock(
                $customer?->customer,
                UserRole::Customer->value,
                'TAX ID',
                $customer?->buyer_number,
            ),
            'items' => $productItems,
            'groups' => $this->bcvLqdGroups($productItems),
            'total_cartons' => $cartonValues->isEmpty() ? '' : $this->quantityOrBlank($cartonValues->sum()),
            'total_weight' => $weightValues->isEmpty() ? '' : $this->weightOrBlank($weightValues->sum()),
            'total_amount' => $this->moneyOrBlank($totalAmount),
            'total_amount_currency' => $this->currencyTotalLabel($firstCurrency),
            'total_amount_label' => trim($this->currencyTotalLabel($firstCurrency) . ' ' . $this->moneyOrBlank($totalAmount)),
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
            'customer' => $this->upperText($customer?->customer),
            'factory_approval_number' => $this->displayText($packer?->packer_number),
            'commission' => $firstCommission !== null && $firstCommission !== ''
                ? $firstCommission
                : $this->commissionText($revenueCustomer?->commission_enabled, $revenueCustomer?->commission_percent),
            'commission_note' => $this->commissionNote($firstCommission, $revenueCustomer?->commission_enabled, $revenueCustomer?->commission_percent),
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
            'cartons_value' => $quantity,
            'weight' => $this->weightOrBlank($this->numberOrNull($item?->total_weight_value) ?? $this->numberOrNull($item?->lqd_qty)),
            'weight_value' => $this->numberOrNull($item?->total_weight_value) ?? $this->numberOrNull($item?->lqd_qty),
            'price' => $this->decimalOrBlank($line['price'], 3),
            'amount' => $this->moneyOrBlank($line['amount']),
            'amount_value' => $line['amount'],
            'amount_currency' => $line['currency'],
            'price_header' => $this->priceHeader($line['currency'], $line['unit']),
            'amount_header' => $this->amountHeader($line['currency']),
            'commission' => $this->itemCommissionText($item?->commission_from_packer, $item?->commission_from_packer_unit_slug),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    private function bcvLqdGroups(array $items): array
    {
        return collect($items)
            ->groupBy(fn (array $item): string => implode('|', [
                $item['product'] ?? '',
                $item['style'] ?? '',
                $item['packing'] ?? '',
                $item['notes'] ?? '',
            ]))
            ->values()
            ->map(function ($group, int $index): array {
                $first = $group->first();

                return [
                    'description' => $this->bcvDescription($first, $index + 1),
                    'rows' => $group->values()->all(),
                ];
            })
            ->all();
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function bcvDescription(array $item, int $number): string
    {
        $lines = [];
        $product = $this->displayText($item['product'] ?? null);
        $style = $this->displayText($item['style'] ?? null);
        $packing = $this->displayText($item['packing'] ?? null);
        $notes = $this->displayText($item['notes'] ?? null);

        $title = trim($product . ($style !== '' ? ' ' . $style : ''));
        if ($title !== '') {
            $lines[] = "{$number}.{$title}.";
        }

        $packingLine = trim('Packing: ' . $packing . ($notes !== '' ? ', ' . $notes : ''));
        if ($packing !== '' || $notes !== '') {
            $lines[] = $packingLine;
        }

        return implode("\n", $lines);
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

    private function weightOrBlank(float|int|string|null $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return number_format((float) $value, 2, '.', ',');
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

    private function formatDotDate(mixed $value): string
    {
        if (! $value) {
            return '';
        }

        try {
            return Carbon::parse($value)->format('d.m.Y');
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

    private function itemCommissionText(mixed $rate, mixed $unit): string
    {
        $formattedRate = $this->decimalOrBlank($rate, 2);

        if ($formattedRate === '' || $this->isZero((float) $rate)) {
            return '';
        }

        $unitLabel = $this->displayUnit($unit);

        return trim('US $ ' . $formattedRate . ($unitLabel !== '' ? '/' . Str::upper($unitLabel) : ''));
    }

    private function commissionNote(?string $itemCommission, mixed $enabled, mixed $percent): string
    {
        $commission = $itemCommission !== null && $itemCommission !== ''
            ? $itemCommission
            : ($enabled ? $this->commissionText($enabled, $percent) : '');

        if ($commission === '' || Str::upper($commission) === 'NO COMMISSION') {
            return '';
        }

        return "The above prices has included commission {$commission} payable to Alkamaris Exports (OPC) Pvt Ltd.";
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

    private function firstFilled(mixed ...$values): string
    {
        foreach ($values as $value) {
            $text = $this->displayText($value);

            if ($text !== '') {
                return $text;
            }
        }

        return '';
    }

    /**
     * @return array{name: string, lines: array<int, string>, registration: string}
     */
    private function partyBlock(mixed $name, string $role, string $registrationLabel, mixed $fallbackRegistration): array
    {
        $partyName = $this->displayText($name);
        $user = $partyName !== ''
            ? User::query()
                ->where('role', $role)
                ->where('name', $partyName)
                ->first(['address', 'registration_number'])
            : null;

        $addressLines = collect(preg_split('/\r\n|\r|\n/', $this->displayText($user?->address)) ?: [])
            ->map(fn (string $line): string => trim($line))
            ->filter()
            ->values()
            ->all();

        $registration = $this->displayText($fallbackRegistration) !== ''
            ? $this->displayText($fallbackRegistration)
            : $this->displayText($user?->registration_number);

        return [
            'name' => Str::upper($partyName),
            'lines' => array_map(fn (string $line): string => Str::upper($line), $addressLines),
            'registration' => $registration !== '' ? $registrationLabel . ': ' . Str::upper($registration) : '',
        ];
    }
}
