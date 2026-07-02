<?php

namespace App\Services\Users;

use App\Enums\UserRole;
use DOMDocument;
use DOMXPath;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use ZipArchive;

final class BulkUserImportService
{
    private const DEFAULT_PASSWORD = 'Password@123';

    /**
     * @return array{total_records:int, successful_users:int, failed_users:array<int, array{row:int, email:string|null, reason:string}>}
     */
    public function import(UploadedFile $file, UserService $userService): array
    {
        $rows = $this->rows($file);
        $summary = [
            'total_records' => count($rows),
            'successful_users' => 0,
            'failed_users' => [],
        ];

        foreach ($rows as $row) {
            $payload = $this->payload($row['data']);
            $validator = Validator::make($payload, $this->rules());

            if ($validator->fails()) {
                $summary['failed_users'][] = [
                    'row' => $row['number'],
                    'email' => $payload['email'] ?? null,
                    'reason' => $validator->errors()->first(),
                ];
                continue;
            }

            try {
                $userService->create($validator->validated());
                $summary['successful_users']++;
            } catch (\Throwable $exception) {
                $summary['failed_users'][] = [
                    'row' => $row['number'],
                    'email' => $payload['email'] ?? null,
                    'reason' => $exception->getMessage() ?: 'Unable to create user.',
                ];
            }
        }

        return $summary;
    }

    /**
     * @return array<int, array{number:int, data:array<string, string>}>
     */
    private function rows(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        return $extension === 'csv'
            ? $this->csvRows($file->getRealPath() ?: $file->path())
            : $this->xlsxRows($file->getRealPath() ?: $file->path());
    }

    /**
     * @return array<int, array{number:int, data:array<string, string>}>
     */
    private function csvRows(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return [];
        }

        try {
            $headers = null;
            $rows = [];
            $rowNumber = 0;

            while (($values = fgetcsv($handle)) !== false) {
                $rowNumber++;

                if ($headers === null) {
                    $headers = array_map([$this, 'normalizeHeader'], $values);
                    if (isset($headers[0])) {
                        $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]) ?: $headers[0];
                    }
                    continue;
                }

                $data = $this->combineRow($headers, $values);
                if ($this->hasAnyValue($data)) {
                    $rows[] = ['number' => $rowNumber, 'data' => $data];
                }
            }

            return $rows;
        } finally {
            fclose($handle);
        }
    }

    /**
     * @return array<int, array{number:int, data:array<string, string>}>
     */
    private function xlsxRows(string $path): array
    {
        $archive = new ZipArchive;

        if ($archive->open($path) !== true) {
            return [];
        }

        try {
            $sharedStrings = $this->sharedStrings($archive);
            $worksheetXml = $archive->getFromName('xl/worksheets/sheet1.xml');

            if ($worksheetXml === false) {
                return [];
            }

            $document = new DOMDocument;
            if (! @$document->loadXML($worksheetXml)) {
                return [];
            }

            $xpath = new DOMXPath($document);
            $xpath->registerNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

            $sheetRows = $xpath->query('//x:sheetData/x:row');
            if ($sheetRows === false) {
                return [];
            }

            $headers = null;
            $rows = [];

            foreach ($sheetRows as $sheetRow) {
                $rowNumber = (int) ($sheetRow->attributes?->getNamedItem('r')?->nodeValue ?: 0);
                $cells = $xpath->query('./x:c', $sheetRow);
                if ($cells === false) {
                    continue;
                }

                $values = [];
                foreach ($cells as $cell) {
                    $reference = strtoupper((string) $cell->attributes?->getNamedItem('r')?->nodeValue);
                    $columnIndex = $this->columnIndex(preg_replace('/[^A-Z]/', '', $reference) ?: '');
                    if ($columnIndex < 0) {
                        continue;
                    }

                    $values[$columnIndex] = $this->cellValue($cell, $sharedStrings, $xpath);
                }

                if ($headers === null) {
                    $headers = array_map([$this, 'normalizeHeader'], $this->denseValues($values));
                    continue;
                }

                $data = $this->combineRow($headers, $this->denseValues($values));
                if ($this->hasAnyValue($data)) {
                    $rows[] = ['number' => $rowNumber ?: count($rows) + 2, 'data' => $data];
                }
            }

            return $rows;
        } finally {
            $archive->close();
        }
    }

    /**
     * @param  array<int, string>  $values
     * @return array<int, string>
     */
    private function denseValues(array $values): array
    {
        if ($values === []) {
            return [];
        }

        $dense = [];
        $max = max(array_keys($values));

        for ($index = 0; $index <= $max; $index++) {
            $dense[$index] = $values[$index] ?? '';
        }

        return $dense;
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, mixed>  $values
     * @return array<string, string>
     */
    private function combineRow(array $headers, array $values): array
    {
        $data = [];

        foreach ($headers as $index => $header) {
            if ($header === '') {
                continue;
            }

            $data[$header] = trim((string) ($values[$index] ?? ''));
        }

        return $data;
    }

    /**
     * @param  array<string, string>  $row
     * @return array<string, mixed>
     */
    private function payload(array $row): array
    {
        $password = $this->value($row, 'password');
        $passwordConfirmation = $this->value($row, 'confirm_password');

        if ($password === '' || $passwordConfirmation === '') {
            $password = self::DEFAULT_PASSWORD;
            $passwordConfirmation = self::DEFAULT_PASSWORD;
        }

        return [
            'name' => $this->value($row, 'company_name') ?: $this->value($row, 'name'),
            'contact_name' => $this->value($row, 'contact_name'),
            'phone_number' => $this->value($row, 'phone_number'),
            'user_type' => strtolower($this->value($row, 'user_type')),
            'email' => $this->value($row, 'email_id'),
            'address' => $this->value($row, 'address'),
            'password' => $password,
            'password_confirmation' => $passwordConfirmation,
        ];
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'contact_name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:20'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'address' => ['required', 'string', 'max:1000'],
            'user_type' => ['required', 'string', Rule::in(UserRole::values())],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    /**
     * @param  array<string, string>  $row
     */
    private function value(array $row, string $key): string
    {
        return trim($row[$key] ?? '');
    }

    private function normalizeHeader(mixed $value): string
    {
        $header = strtolower(trim((string) $value));
        $header = preg_replace('/[^a-z0-9]+/', '_', $header) ?: '';
        $header = trim($header, '_');

        return match ($header) {
            'company_name_name' => 'company_name',
            'email', 'email_address', 'email_id' => 'email_id',
            'confirm_password', 'password_confirmation' => 'confirm_password',
            default => $header,
        };
    }

    /**
     * @param  array<string, string>  $data
     */
    private function hasAnyValue(array $data): bool
    {
        foreach ($data as $value) {
            if (trim($value) !== '') {
                return true;
            }
        }

        return false;
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
     */
    private function cellValue(\DOMNode $cell, array $sharedStrings, DOMXPath $xpath): string
    {
        $type = (string) $cell->attributes?->getNamedItem('t')?->nodeValue;

        if ($type === 'inlineStr') {
            return trim((string) $xpath->query('.//x:t', $cell)?->item(0)?->textContent);
        }

        $valueNode = $xpath->query('./x:v', $cell)?->item(0);
        if ($valueNode === null) {
            return '';
        }

        $raw = trim($valueNode->textContent);
        if ($type === 's') {
            return trim($sharedStrings[(int) $raw] ?? '');
        }

        return $raw;
    }

    private function columnIndex(string $column): int
    {
        $index = 0;
        $length = strlen($column);

        for ($i = 0; $i < $length; $i++) {
            $index = ($index * 26) + (ord($column[$i]) - 64);
        }

        return $index - 1;
    }
}
