<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transactions\RenderTransactionDocumentRequest;
use App\Models\Transaction;
use App\Services\Transactions\TransactionDocumentService;
use Illuminate\Http\JsonResponse;

class TransactionDocumentController extends Controller
{
    public function __construct(
        private readonly TransactionDocumentService $documentService,
    ) {
    }

    public function render(RenderTransactionDocumentRequest $request, Transaction $transaction): JsonResponse
    {
        $transaction->load(Transaction::detailRelations());
        $validated = $request->validated();

        $documents = $this->documentService->render(
            $transaction,
            $validated['document_types'],
            $validated['options'] ?? [],
        );

        return response()->json(['data' => $documents]);
    }
}
