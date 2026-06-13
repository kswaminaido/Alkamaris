<?php

namespace App\Jobs;

use App\Enums\TransactionStatus;
use App\Models\Transaction;
use App\Services\Mail\MailchimpCampaignMailer;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use RuntimeException;

final class OverdueEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(MailchimpCampaignMailer $mailchimp): void
    {
        $today = Carbon::now()->toDateString();

        // Get all unshipped transactions where LSD min date has passed
        $overdueTransactions = Transaction::query()
            ->where('status', TransactionStatus::Unshipped)
            ->where(function ($query) use ($today) {
                $query->whereHas('shippingDetailsCustomer', function ($query) use ($today) {
                    $query->where('lsd_min', '<', $today);
                })
                ->orWhereHas('shippingDetailsPacker', function ($query) use ($today) {
                    $query->where('lsd_min', '<', $today);
                });
            })
            ->with(['shippingDetailsCustomer', 'shippingDetailsPacker', 'salesPerson'])
            ->get();

        if ($overdueTransactions->isEmpty()) {
            Log::info('No overdue transactions found.');
            return;
        }

        // Get the email recipients from config
        $emailRecipients = config('services.overdue_emails_to', []);
        if (empty($emailRecipients)) {
            Log::warning('No email recipients configured for overdue alerts.');
            return;
        }

        // Prepare email content
        $emailContent = $this->generateEmailContent($overdueTransactions);

        // Send via Mailchimp
        $this->sendViaMailchimp($mailchimp, $emailRecipients, $emailContent, $overdueTransactions);
    }

    /**
     * Generate email content with overdue transactions
     */
    private function generateEmailContent($transactions): array
    {
        return [
            'subject' => 'Overdue Transactions Alert - ' . Carbon::now()->format('Y-m-d'),
            'html' => $this->generateHtmlContent($transactions),
        ];
    }

    /**
     * Generate HTML email content
     */
    private function generateHtmlContent($transactions): string
    {
        $rows = '';
        
        foreach ($transactions as $transaction) {
            $lsdMinRaw = $transaction->shippingDetailsCustomer?->lsd_min 
                ?? $transaction->shippingDetailsPacker?->lsd_min 
                ?? null;
            
            $lsdMin = $lsdMinRaw ? Carbon::parse($lsdMinRaw)->format('jS M, Y') : 'N/A';
            
            $delayedDays = 'N/A';
            if ($lsdMinRaw) {
                $delayedDays = (int) Carbon::parse($lsdMinRaw)->diffInDays(Carbon::now());
            }
            
            $salesPerson = $transaction->salesPerson?->name ?? 'N/A';

            $rows .= "
        <tr>
            <td style=\"padding: 10px; border: 1px solid #ddd;\"><a href=\"https://erpalkamaris.com/transactions\" style=\"text-decoration: none;\">{$transaction->booking_no}</a></td>
            <td style=\"padding: 10px; border: 1px solid #ddd;\">{$lsdMin}</td>
            <td style=\"padding: 10px; border: 1px solid #ddd;\">{$delayedDays}</td>
            <td style=\"padding: 10px; border: 1px solid #ddd;\">{$salesPerson}</td>
            <td style=\"padding: 10px; border: 1px solid #ddd;\">{$transaction->status->label()}</td>
        </tr>
";
        }

        return "
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { padding: 10px; text-align: left; border: 1px solid #ddd; background-color: #f2f2f2; font-weight: bold; }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; }
        .alert { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class=\"container\">
        <h2>⚠️ Overdue Transactions Alert</h2>
        
        <div class=\"alert\">
            <strong>Action Required:</strong> The following transactions have crossed their Latest Ship Date (LSD Min) and require immediate attention.
        </div>

        <table>
            <thead>
                <tr>
                    <th>Booking No</th>
                    <th>LSD Min Date</th>
                    <th>Delayed By (Days)</th>
                    <th>Sales Person</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {$rows}
            </tbody>
        </table>

        <p><strong>Total Overdue Transactions:</strong> {$transactions->count()}</p>
        <p style=\"color: #d32f2f;\"><strong>Please take immediate action to ship these transactions.</strong></p>

        <hr style=\"margin-top: 40px;\">
        <p style=\"font-size: 12px; color: #999;\">This is an automated alert from Alkamaris Transaction Management System</p>
    </div>
</body>
</html>
";
    }

    /**
     * Send email via Mailchimp API
     */
    private function sendViaMailchimp(MailchimpCampaignMailer $mailchimp, array $recipients, array $emailContent, $transactions): void
    {
        try {
            if (! $mailchimp->isConfigured()) {
                Log::error('Mailchimp API credentials not configured');
                return;
            }

            $result = $mailchimp->sendCampaign(
                $recipients,
                $emailContent['subject'],
                $emailContent['html'],
                'Overdue Transactions Alert - ' . Carbon::now()->format('Y-m-d H:i:s'),
            );

            Log::info('Overdue email sent successfully via Mailchimp', [
                'campaign_id' => $result['campaign_id'],
                'recipient_count' => $result['recipient_count'],
                'transaction_count' => $transactions->count(),
                'recipients' => $recipients,
            ]);
        } catch (RuntimeException $e) {
            Log::error('Failed to send overdue email via Mailchimp', [
                'message' => $e->getMessage(),
            ]);
        } catch (\Exception $e) {
            Log::error('Exception while sending overdue email via Mailchimp', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
