<?php

namespace App\Services\Transactions;

use Illuminate\Support\Facades\Log;
use DOMDocument;
use DOMXPath;
use ZipArchive;

final class TransactionItemOptionService
{
    /**
     * @return array<string, array<int, string>>
     */
    public function all(): array
    {
        $path = resource_path('xlsx/For ERP.xlsx');

        if (! is_file($path)) {
            return $this->emptyOptions();
        }

        $archive = new ZipArchive();

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
     * @return array<int, string>
     */
    private function sharedStrings(ZipArchive $archive): array
    {
        $xml = $archive->getFromName('xl/sharedStrings.xml');

        if ($xml === false) {
            return [];
        }

        $document = new DOMDocument();

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
        $document = new DOMDocument();

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
        $section = 'catalog';

        foreach ($rows as $rowIndex => $row) {
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

            if ($rowIndex === 0) {
                continue;
            }

            if (($rowValues['B'] ?? null) === 'Brand' || ($rowValues['E'] ?? null) === 'Size') {
                $section = 'brand_size';
                continue;
            }

            if ($section === 'catalog') {
                if (isset($rowValues['B'])) {
                    $options['product'][] = $rowValues['B'];
                }

                if (isset($rowValues['E'])) {
                    $options['style'][] = $rowValues['E'];
                }

                if (isset($rowValues['G'])) {
                    $options['packing'][] = $rowValues['G'];
                }

                continue;
            }

            if (isset($rowValues['B'])) {
                $options['brand'][] = $rowValues['B'];
            }

            if (isset($rowValues['E'])) {
                $options['size'][] = $rowValues['E'];
            }
        }

        return array_map([$this, 'uniqueValues'], $options);
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
            'brand' => [],
            'size' => [],
        ];
    }
}
