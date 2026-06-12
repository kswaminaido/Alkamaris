<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transactions\RenderTransactionDocumentRequest;
use App\Models\Transaction;
use App\Services\Audit\UserEventLogger;
use App\Services\Transactions\TransactionDocumentService;
use Illuminate\Http\JsonResponse;

class TransactionDocumentController extends Controller
{
    public function __construct(
        private readonly TransactionDocumentService $documentService,
        private readonly UserEventLogger $userEventLogger,
    ) {}

    public function render(RenderTransactionDocumentRequest $request, Transaction $transaction): JsonResponse
    {
        $transaction->load(Transaction::detailRelations());
        $validated = $request->validated();

        $documents = $this->documentService->render(
            $transaction,
            $validated['document_types'],
            $validated['options'] ?? [],
        );

        $this->userEventLogger->log(
            $request->user(),
            'Document',
            'Document generated',
            $transaction->id,
            newValues: [
                'transaction_id' => $transaction->id,
                'document_types' => $validated['document_types'],
                'options' => $validated['options'] ?? [],
            ],
            description: "Documents generated for transaction ID {$transaction->id}",
        );

        return response()->json(['data' => $documents]);
    }
}
