<?php

namespace App\Services\Transactions;

use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;

class TransactionDocumentService
{
    /**
     * @var array<string, string>
     */
    private const DOCUMENT_LABELS = [
        'all' => 'Print All',
        'bcb_lqd' => 'Print BCB /Lqd.',
        'bcv_lqd' => 'Print BCV /Lqd.',
        'sales_contract_packer' => 'Print Sales Contract Packer',
        'appendix_packer' => 'Print Appendix Packer',
        'proforma_invoice' => 'Print Proforma Inv',
        'specs' => 'Print Specs',
        's_a' => 'Print S/A',
        'lc_terms_vendor' => 'Print L/C Terms(Vendor)',
        'lc_terms' => 'Print L/C Terms',
        'delivery_order' => 'Print Delivery Order',
    ];

    public function __construct(
        private readonly TransactionDocumentViewDataFactory $viewDataFactory,
    ) {}

    /**
     * @param  array<int, string>  $documentTypes
     * @param  array<string, mixed>  $options
     * @return array<int, array<string, mixed>>
     */
    public function render(Transaction $transaction, array $documentTypes, array $options = []): array
    {
        return $this->normalizeTypes($documentTypes)
            ->map(fn (string $documentType): array => $this->buildDocument($transaction, $documentType, $options))
            ->all();
    }

    /**
     * @param  array<int, string>  $documentTypes
     * @return \Illuminate\Support\Collection<int, string>
     */
    private function normalizeTypes(array $documentTypes)
    {
        $normalizedTypes = collect($documentTypes)
            ->map(fn (mixed $value): string => Str::of((string) $value)->lower()->replace('-', '_')->value())
            ->filter(fn (string $value): bool => array_key_exists($value, self::DOCUMENT_LABELS))
            ->unique()
            ->values();

        if ($normalizedTypes->isEmpty()) {
            return collect(['bcb_lqd']);
        }

        if ($normalizedTypes->contains('all')) {
            return collect(array_keys(self::DOCUMENT_LABELS))
                ->reject(fn (string $type): bool => $type === 'all')
                ->values();
        }

        return $normalizedTypes;
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    private function buildDocument(Transaction $transaction, string $documentType, array $options): array
    {
        $label = self::DOCUMENT_LABELS[$documentType] ?? Str::headline($documentType);
        $view = $this->viewDataFactory->build($transaction, $documentType, $options, $label);
        $previewHtml = $this->renderPreviewHtml($view);

        return [
            'type' => $documentType,
            'label' => $label,
            'preview_html' => $previewHtml,
            'pdf' => $this->binaryPayload("{$view['file_stem']}.pdf", 'application/pdf', $this->buildPdfBinary($previewHtml)),
            'word' => $this->binaryPayload("{$view['file_stem']}.doc", 'application/msword', $previewHtml),
        ];
    }

    /**
     * @param  array<string, mixed>  $view
     */
    private function renderPreviewHtml(array $view): string
    {
        return view('documents.transactions.preview', [
            'view' => $view,
        ])->render();
    }

    /**
     * @return array<string, string>
     */
    private function binaryPayload(string $filename, string $mimeType, string $content): array
    {
        return [
            'filename' => $filename,
            'mime_type' => $mimeType,
            'content_base64' => base64_encode($content),
        ];
    }

    private function buildPdfBinary(string $previewHtml): string
    {
        return Pdf::loadHTML($previewHtml)
            ->setPaper('a4', 'portrait')
            ->output();
    }
}
