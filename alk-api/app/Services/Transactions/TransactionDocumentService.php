<?php

namespace App\Services\Transactions;

use App\Models\Transaction;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;

class TransactionDocumentService
{
    /**
     * @var array<string, string>
     */
    private const DOCUMENT_LABELS = [
        'all' => 'Print All',
        'bcb_lqd' => 'Print BCB /Lqd',
        'bcv_lqd' => 'Print BCV /Lqd',
        'sales_contract_packer' => 'Print Sales Contract Packer',
        'appendix_packer' => 'Print Appendix Packer',
        'proforma_invoice' => 'Print Proforma Inv',
        'specs' => 'Print Specs',
        's_a' => 'Print S/A',
        'lc_terms_vendor' => 'Print L/C Terms (Packer)',
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
            ->map(fn(string $documentType): array => $this->buildDocument($transaction, $documentType, $options))
            ->all();
    }

    /**
     * @param  array<int, string>  $documentTypes
     * @return \Illuminate\Support\Collection<int, string>
     */
    private function normalizeTypes(array $documentTypes)
    {
        $normalizedTypes = collect($documentTypes)
            ->map(fn(mixed $value): string => Str::of((string) $value)->lower()->replace('-', '_')->value())
            ->filter(fn(string $value): bool => array_key_exists($value, self::DOCUMENT_LABELS))
            ->unique()
            ->values();

        if ($normalizedTypes->isEmpty()) {
            return collect(['bcb_lqd']);
        }

        if ($normalizedTypes->contains('all')) {
            return collect(array_keys(self::DOCUMENT_LABELS))
                ->reject(fn(string $type): bool => $type === 'all')
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
        $transaction->load(['createdBy:id,name,email,authorization_signature_path,authorization_stamp_path']);
        $authorizationUser = $transaction->createdBy;
        $view = $this->viewDataFactory->build($transaction, $documentType, $options, $label, $authorizationUser);
        $previewHtml = $this->renderPreviewHtml($view);

        return [
            'type' => $documentType,
            'label' => $label,
            'preview_html' => $previewHtml,
            'pdf' => $this->binaryPayload(Str::upper("{$view['file_stem']}.pdf"), 'application/pdf', $this->buildPdfBinary($previewHtml)),
            'word' => $this->binaryPayload("{$view['file_stem']}.doc", 'application/msword', $this->buildWordBinary($previewHtml)),
        ];
    }

    /**
     * @param  array<string, mixed>  $view
     */
    private function renderPreviewHtml(array $view): string
    {
        $template = 'documents.transactions.' . ($view['body_template'] ?? 'preview');

        return view($template, [
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
            ->setOption('defaultMediaType', 'print')
            ->setPaper('a4', 'portrait')
            ->output();
    }

    private function buildWordBinary(string $previewHtml): string
    {
        $images = [];
        $index = 0;

        $html = preg_replace_callback(
            '/src="data:([^;"]+);base64,([^"]+)"/',
            function (array $matches) use (&$images, &$index): string {
                $contentId = "image{$index}@alkamaris";
                $extension = $this->mimeExtension($matches[1]);

                $images[] = [
                    'content_id' => $contentId,
                    'mime_type' => $matches[1],
                    'filename' => "image{$index}.{$extension}",
                    'content_base64' => $matches[2],
                ];

                $index++;

                return 'src="cid:' . $contentId . '"';
            },
            $previewHtml,
        ) ?? $previewHtml;

        if ($images === []) {
            return $this->withWordMarkup($previewHtml);
        }

        $html = $this->withWordMarkup($html);

        $boundary = '----=_AlkamarisWord_' . Str::random(24);
        $parts = [
            'MIME-Version: 1.0',
            'Content-Type: multipart/related; boundary="' . $boundary . '"; type="text/html"',
            '',
            '--' . $boundary,
            'Content-Type: text/html; charset="utf-8"',
            'Content-Transfer-Encoding: quoted-printable',
            'Content-Location: document.html',
            '',
            quoted_printable_encode($html),
        ];

        foreach ($images as $image) {
            $parts[] = '--' . $boundary;
            $parts[] = 'Content-Type: ' . $image['mime_type'];
            $parts[] = 'Content-Transfer-Encoding: base64';
            $parts[] = 'Content-ID: <' . $image['content_id'] . '>';
            $parts[] = 'Content-Location: ' . $image['filename'];
            $parts[] = '';
            $parts[] = chunk_split($image['content_base64'], 76, "\r\n");
        }

        $parts[] = '--' . $boundary . '--';
        $parts[] = '';

        return implode("\r\n", $parts);
    }

    private function withWordMarkup(string $html): string
    {
        return $this->withWordSignatureMarkup($this->withWordItemTableMarkup($this->withWordStyles($html)));
    }

    private function withWordStyles(string $html): string
    {
        $wordStyles = <<<'HTML'
<style>
  body, .doc-page {
    font-size: 7.5pt !important;
    line-height: 9pt !important;
  }

  table {
    border-collapse: collapse !important;
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
  }

  table.main,
  table.main.items {
    border: 1pt solid #000 !important;
    margin: 0 !important;
  }

  .main td,
  .main th,
  .items td,
  .items th {
    border: 0.75pt solid #000 !important;
    padding: 2pt 3pt !important;
    font-size: 7.5pt !important;
    line-height: 9pt !important;
  }

  .company-row td {
    border-bottom: 0 !important;
  }

  .logo-cell {
    border-right: 0 !important;
  }

  .company-cell {
    border-left: 0 !important;
  }

  .title-row td {
    border-top: 0 !important;
    padding: 0 !important;
  }

  .section-head td,
  .items th,
  .comments-head td {
    border: 0.75pt solid #000 !important;
    background: #061173 !important;
    color: #ffffff !important;
  }

  .company-name {
    font-size: 12pt !important;
    line-height: 14pt !important;
  }

  .tagline,
  .comments td,
  .signature,
  .customer-signature {
    font-size: 8pt !important;
    line-height: 9.5pt !important;
  }

  .title-band {
    font-size: 11pt !important;
    line-height: 13pt !important;
  }

  .comments-box {
    border-top: 0.75pt solid #000 !important;
    min-height: 156pt !important;
    padding: 18pt 3pt 3pt !important;
  }

  .comments td,
  .signature td {
    border: 0 !important;
  }

  .signature-line,
  .customer-signature-line {
    border-top: 0.75pt solid #000 !important;
  }

  .disclaimer {
    font-size: 7pt !important;
    line-height: 8.5pt !important;
  }
</style>
HTML;

        if (str_contains($html, '</head>')) {
            return str_replace('</head>', $wordStyles . "\n</head>", $html);
        }

        return $wordStyles . $html;
    }

    private function withWordItemTableMarkup(string $html): string
    {
        return preg_replace_callback(
            '/<table class="main items">(.*?)<\/table>/s',
            function (array $matches): string {
                $table = $matches[1];
                $table = preg_replace('/<th([^>]*)>/', '<th$1 bgcolor="#061173" style="background-color:#061173;color:#ffffff;border:0.75pt solid #000;mso-border-alt:solid #000 0.75pt;padding:2pt 3pt;font-size:7.5pt;line-height:9pt;">', $table) ?? $table;
                $table = preg_replace('/<td([^>]*)>/', '<td$1 style="border:0.75pt solid #000;mso-border-alt:solid #000 0.75pt;padding:2pt 3pt;font-size:7.5pt;line-height:9pt;">', $table) ?? $table;

                return '<table class="main items" border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1pt solid #000;mso-border-alt:solid #000 0.75pt;">' . $table . '</table>';
            },
            $html,
        ) ?? $html;
    }

    private function withWordSignatureMarkup(string $html): string
    {
        $lineStyle = 'border-top:0.75pt solid #000;mso-border-top-alt:solid #000 0.75pt;'
            . 'height:1pt;line-height:1pt;font-size:1pt;width:100%;margin:0 auto 5pt;';

        $html = preg_replace(
            '/<div class="signature-line"><\/div>/',
            '<div class="signature-line" style="' . $lineStyle . '">&nbsp;</div>',
            $html,
        ) ?? $html;

        return preg_replace(
            '/<div class="customer-signature-line"><\/div>/',
            '<div class="customer-signature-line" style="' . $lineStyle . '">&nbsp;</div>',
            $html,
        ) ?? $html;
    }

    private function mimeExtension(string $mimeType): string
    {
        return match (strtolower($mimeType)) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            default => 'png',
        };
    }
}
