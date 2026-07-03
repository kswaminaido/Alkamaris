<?php

namespace App\Http\Requests\Transactions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class RenderTransactionDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'document_types' => ['required', 'array', 'min:1'],
            'document_types.*' => ['required', 'string', 'max:100'],
            'options' => ['nullable', 'array'],
            'options.print_revised' => ['nullable', 'string', 'max:50'],
            'options.revision_number' => ['nullable', 'integer', 'between:1,10'],
            'options.print_liquidation' => ['nullable', 'string', 'max:50'],
            'options.show_glazing' => ['nullable', 'string', 'max:50'],
            'options.template' => ['nullable', 'string', 'max:100'],
            'options.approve_code' => ['nullable', 'string', 'max:100'],
            'options.payment_advance' => ['nullable', 'string', 'max:100'],
            'options.articles' => ['nullable', 'array'],
            'options.articles.*' => ['nullable', 'string'],
            'options.attachments' => ['nullable', 'array'],
            'options.attachments.*' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $printRevised = strtoupper(trim((string) $this->input('options.print_revised', '')));

                if ($printRevised !== 'YES') {
                    return;
                }

                $revisionNumber = $this->input('options.revision_number');
                if ($revisionNumber === null || $revisionNumber === '') {
                    $validator->errors()->add('options.revision_number', 'Select a revision number.');
                }
            },
        ];
    }
}
