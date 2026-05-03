<?php

namespace App\Http\Controllers\Api;

use App\Models\GeneralInfoCustomer;
use App\Models\GeneralInfoPacker;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class MailController extends Controller
{
    public function recipients(Request $request): JsonResponse
    {
        $type = $request->string('type', 'customers');
        $fromDate = $request->date('from_date');
        $toDate = $request->date('to_date');

        $query = Transaction::query()
            ->distinct()
            ->orderBy('id');

        if ($fromDate) {
            $query->whereDate('created_at', '>=', $fromDate);
        }

        if ($toDate) {
            $query->whereDate('created_at', '<=', $toDate);
        }

        if ($type === 'customers') {
            $query->with('generalInfoCustomer:transaction_id,customer')
                ->whereHas('generalInfoCustomer');

            $recipients = $query->get()
                ->map(fn($transaction) => $transaction->generalInfoCustomer)
                ->filter(fn($info) => $info !== null)
                ->unique(fn($info) => $info->customer)
                ->values()
                ->map(fn($info, $index) => [
                    'id' => $index,
                    'name' => $info->customer ?? 'Unknown',
                    'email' => $this->getCustomerEmail($info->customer),
                ])
                ->values()
                ->all();
        } else {
            $query->with('generalInfoPacker:transaction_id,vendor')
                ->whereHas('generalInfoPacker');

            $recipients = $query->get()
                ->map(fn($transaction) => $transaction->generalInfoPacker)
                ->filter(fn($info) => $info !== null)
                ->unique(fn($info) => $info->vendor)
                ->values()
                ->map(fn($info, $index) => [
                    'id' => $index,
                    'name' => $info->vendor ?? 'Unknown',
                    'email' => $this->getPackerEmail($info->vendor),
                ])
                ->values()
                ->all();
        }

        return response()->json(['data' => $recipients]);
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['required', 'email'],
            'recipients' => ['required', 'array', 'min:1'],
            'recipient_type' => ['required', 'in:customers,packers,vendors'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
        ]);

        try {
            $recipients = $this->getRecipientEmails(
                $validated['recipients'],
                $validated['recipient_type'],
            );

            if (empty($recipients)) {
                return response()->json(
                    ['message' => 'No valid recipients found'],
                    400,
                );
            }

            foreach ($recipients as $email) {
                Mail::raw($validated['body'], function ($message) use ($email, $validated) {
                    $message->to($email)
                        ->from($validated['from'])
                        ->subject($validated['subject']);
                });
            }

            return response()->json(
                ['message' => 'Emails sent successfully to ' . count($recipients) . ' recipient(s)'],
                200,
            );
        } catch (\Exception $e) {
            return response()->json(
                ['message' => 'Error sending emails: ' . $e->getMessage()],
                500,
            );
        }
    }

    /**
     * @param array<int> $recipientIds
     * @param string $type
     * @return array<string>
     */
    private function getRecipientEmails(array $recipientIds, string $type): array
    {
        $recipients = Transaction::query()
            ->distinct()
            ->orderBy('id');

        if ($type === 'customers') {
            $recipients->with('generalInfoCustomer:transaction_id,customer')
                ->whereHas('generalInfoCustomer');

            return $recipients->get()
                ->map(fn($transaction) => $transaction->generalInfoCustomer)
                ->filter(fn($info) => $info !== null)
                ->unique(fn($info) => $info->customer)
                ->values()
                ->slice(0, count($recipientIds))
                ->map(fn($info) => $this->getCustomerEmail($info->customer))
                ->filter()
                ->values()
                ->all();
        } else {
            $recipients->with('generalInfoPacker:transaction_id,vendor')
                ->whereHas('generalInfoPacker');

            return $recipients->get()
                ->map(fn($transaction) => $transaction->generalInfoPacker)
                ->filter(fn($info) => $info !== null)
                ->unique(fn($info) => $info->vendor)
                ->values()
                ->slice(0, count($recipientIds))
                ->map(fn($info) => $this->getPackerEmail($info->vendor))
                ->filter()
                ->values()
                ->all();
        }
    }

    private function getCustomerEmail(?string $customer): ?string
    {
        // This is a placeholder - implement based on your system's customer email storage
        // You might fetch from a customers table or configuration
        if (!$customer) {
            return null;
        }

        // For demonstration, return a default email
        // In production, you'd look this up from your database
        return strtolower(str_replace(' ', '.', $customer)) . '@example.com';
    }

    private function getPackerEmail(?string $packer): ?string
    {
        // This is a placeholder - implement based on your system's packer email storage.
        if (!$packer) {
            return null;
        }

        // For demonstration, return a default email
        // In production, you'd look this up from your database
        return strtolower(str_replace(' ', '.', $packer)) . '@example.com';
    }
}
