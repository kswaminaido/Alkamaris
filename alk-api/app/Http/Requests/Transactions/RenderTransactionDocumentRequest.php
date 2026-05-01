<?php

namespace App\Http\Requests\Transactions;

use Illuminate\Foundation\Http\FormRequest;

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
}
