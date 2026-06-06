<?php

namespace App\Services\Transactions;

use App\Models\Config;
use App\Models\TransactionItem;
use DOMDocument;
use DOMXPath;
use Illuminate\Support\Facades\Log;
use ZipArchive;

final class TransactionItemOptionService
{
    private const DEFAULT_BRANDS = [
        'PLAIN+STICKER',
        'PORTICO',
        'PORTSIDE',
        'PORTSIDE SEAFOOD',
        'PPS',
        'PREFERENCE',
        'PREMIER',
        'PREMIUM',
        'PREMIUM CATCH',
        'PREMIUM CATCH / 5 OCEANS',
    ];

    private const CONFIG_TYPES = [
        'product' => 'transaction_item_products',
        'style' => 'transaction_item_styles',
        'packing' => 'transaction_item_packings',
        'brand' => 'transaction_item_brands',
        'size' => 'transaction_item_sizes',
    ];

    /**
     * @return array<string, array<int, string>>
     */
    public function all(): array
    {
        $configured = $this->fromConfig();

        if ($this->hasConfiguredOptions($configured)) {
            return $this->withSavedItemOptions($configured);
        }

        return $this->withSavedItemOptions($this->extractOptionsFromWorkbook($this->defaultWorkbookPath()));
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function sync(?string $path = null): array
    {
        $options = $this->extractOptionsFromWorkbook($path ?: $this->defaultWorkbookPath());

        foreach (self::CONFIG_TYPES as $field => $type) {
            Config::query()->updateOrCreate(
                ['type' => $type],
                ['data' => $options[$field] ?? []],
            );
        }

        return $options;
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function extractOptionsFromWorkbook(string $path): array
    {
        if (! is_file($path)) {
            return $this->emptyOptions();
        }

        $archive = new ZipArchive;

        if ($archive->open($path) !== true) {
            return $this->emptyOptions();
        }

        try {
            $sharedStrings = $this->sharedStrings($archive);
            $worksheetXml = $archive->getFromName('xl/worksheets/sheet1.xml');

            if ($worksheetXml === false) {
                return $this->emptyOptions();
            }

            return $this->extractOptions($worksheetXml, $sharedStrings);
        } catch (\Throwable $exception) {
            Log::warning('Unable to read transaction item options from workbook.', [
                'path' => $path,
                'error' => $exception->getMessage(),
            ]);

            return $this->emptyOptions();
        } finally {
            $archive->close();
        }
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function fromConfig(): array
    {
        $options = $this->emptyOptions();
        $configs = Config::query()
            ->whereIn('type', array_values(self::CONFIG_TYPES))
            ->get()
            ->keyBy('type');

        foreach (self::CONFIG_TYPES as $field => $type) {
            $config = $configs->get($type);
            $options[$field] = $this->uniqueValues([
                ...($field === 'brand' ? self::DEFAULT_BRANDS : []),
                ...(is_array($config?->data) ? $config->data : []),
            ]);
        }

        return $options;
    }

    /**
     * @param  array<string, array<int, string>>  $options
     */
    private function hasConfiguredOptions(array $options): bool
    {
        foreach (array_keys(self::CONFIG_TYPES) as $field) {
            $values = $field === 'brand'
                ? array_diff($options[$field] ?? [], self::DEFAULT_BRANDS)
                : ($options[$field] ?? []);

            if ($values !== []) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, array<int, string>>  $options
     * @return array<string, array<int, string>>
     */
    private function withSavedItemOptions(array $options): array
    {
        foreach (array_keys($this->emptyOptions()) as $field) {
            $savedValues = TransactionItem::query()
                ->whereNotNull($field)
                ->distinct()
                ->pluck($field)
                ->all();

            $options[$field] = $this->uniqueValues([
                ...($options[$field] ?? []),
                ...$savedValues,
            ]);
        }

        return $options;
    }

    /**
     * @return array<int, string>
     */
    private function sharedStrings(ZipArchive $archive): array
    {
        $xml = $archive->getFromName('xl/sharedStrings.xml');

        if ($xml === false) {
            return [];
        }

        $document = new DOMDocument;

        if (! @$document->loadXML($xml)) {
            return [];
        }

        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        $items = $xpath->query('//x:si');

        if ($items === false) {
            return [];
        }

        $sharedStrings = [];

        foreach ($items as $item) {
            $parts = $xpath->query('.//x:t', $item);
            $value = '';

            if ($parts !== false) {
                foreach ($parts as $part) {
                    $value .= $part->textContent;
                }
            }

            $sharedStrings[] = trim($value);
        }

        return $sharedStrings;
    }

    /**
     * @param  array<int, string>  $sharedStrings
     * @return array<string, array<int, string>>
     */
    private function extractOptions(string $worksheetXml, array $sharedStrings): array
    {
        $document = new DOMDocument;

        if (! @$document->loadXML($worksheetXml)) {
            return $this->emptyOptions();
        }

        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        $rows = $xpath->query('//x:sheetData/x:row');

        if ($rows === false || $rows->length === 0) {
            return $this->emptyOptions();
        }

        $options = $this->emptyOptions();
        $section = null;
        $catalogColumns = [
            'product' => 'B',
            'style' => 'E',
            'packing' => 'G',
        ];
        $brandSizeColumns = [
            'brand' => 'B',
            'size' => 'E',
        ];

        foreach ($rows as $row) {
            $cells = $xpath->query('./x:c', $row);

            if ($cells === false) {
                continue;
            }

            $rowValues = [];

            foreach ($cells as $cell) {
                $reference = strtoupper((string) $cell->attributes?->getNamedItem('r')?->nodeValue);
                $column = preg_replace('/[^A-Z]/', '', $reference) ?: '';
                $value = $this->cellValue($cell, $sharedStrings, $xpath);

                if ($value === '') {
                    continue;
                }

                $rowValues[$column] = $value;
            }

            if ($rowValues === []) {
                continue;
            }

            $productColumn = $this->columnFor($rowValues, 'Product');
            $styleColumn = $this->columnFor($rowValues, 'Style');
            $packingColumn = $this->columnFor($rowValues, 'Packing');

            if ($productColumn !== null || $styleColumn !== null || $packingColumn !== null) {
                $section = 'catalog';
                $catalogColumns = [
                    'product' => $productColumn ?? $catalogColumns['product'],
                    'style' => $styleColumn ?? $catalogColumns['style'],
                    'packing' => $packingColumn ?? $catalogColumns['packing'],
                ];

                continue;
            }

            $brandColumn = $this->columnFor($rowValues, 'Brand');
            $sizeColumn = $this->columnFor($rowValues, 'Size');

            if ($brandColumn !== null || $sizeColumn !== null) {
                $section = 'brand_size';
                $brandSizeColumns = [
                    'brand' => $brandColumn ?? $brandSizeColumns['brand'],
                    'size' => $sizeColumn ?? $brandSizeColumns['size'],
                ];

                continue;
            }

            if ($section === 'catalog') {
                if (isset($rowValues[$catalogColumns['product']])) {
                    $options['product'][] = $rowValues[$catalogColumns['product']];
                }

                if (isset($rowValues[$catalogColumns['style']])) {
                    $options['style'][] = $rowValues[$catalogColumns['style']];
                }

                if (isset($rowValues[$catalogColumns['packing']])) {
                    $options['packing'][] = $rowValues[$catalogColumns['packing']];
                }

                continue;
            }

            if ($section !== 'brand_size') {
                continue;
            }

            if (isset($rowValues[$brandSizeColumns['brand']])) {
                $options['brand'][] = $rowValues[$brandSizeColumns['brand']];
            }

            if (isset($rowValues[$brandSizeColumns['size']])) {
                $options['size'][] = $rowValues[$brandSizeColumns['size']];
            }
        }

        return array_map([$this, 'uniqueValues'], $options);
    }

    /**
     * @param  array<string, string>  $rowValues
     */
    private function columnFor(array $rowValues, string $label): ?string
    {
        foreach ($rowValues as $column => $value) {
            if (strcasecmp($value, $label) === 0) {
                return $column;
            }
        }

        return null;
    }

    /**
     * @param  array<int, string>  $sharedStrings
     */
    private function cellValue(\DOMNode $cell, array $sharedStrings, DOMXPath $xpath): string
    {
        $type = (string) $cell->attributes?->getNamedItem('t')?->nodeValue;
        $valueNode = $xpath->query('./x:v', $cell)?->item(0);

        if ($valueNode === null) {
            return '';
        }

        $raw = trim($valueNode->textContent);

        if ($raw === '') {
            return '';
        }

        if ($type === 's') {
            return trim($sharedStrings[(int) $raw] ?? '');
        }

        return $raw;
    }

    /**
     * @param  array<int, string>  $values
     * @return array<int, string>
     */
    private function uniqueValues(array $values): array
    {
        $normalized = array_values(array_filter(array_map(static fn (mixed $value): string => trim((string) $value), $values)));
        $unique = array_values(array_unique($normalized));
        sort($unique);

        return $unique;
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function emptyOptions(): array
    {
        return [
            'product' => [],
            'style' => [],
            'packing' => [],
            'brand' => self::DEFAULT_BRANDS,
            'size' => [],
        ];
    }

    private function defaultWorkbookPath(): string
    {
        return resource_path('xlsx/For ERP-1.xlsx');
    }
}
