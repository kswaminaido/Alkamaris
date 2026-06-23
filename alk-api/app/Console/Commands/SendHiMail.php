<?php

namespace App\Console\Commands;

use App\Services\Mail\MailchimpCampaignMailer;
use Illuminate\Console\Command;
use Throwable;

class SendHiMail extends Command
{
    protected $signature = 'mail:test-hi';

    protected $description = 'Send a small hi test email to TEST_USER recipients.';

    public function handle(MailchimpCampaignMailer $mailchimp): int
    {
        $recipients = config('services.test_user_emails', []);

        if (empty($recipients)) {
            $this->error('No recipients configured. Set TEST_USER in .env.');

            return self::FAILURE;
        }

        if (! $mailchimp->isConfigured()) {
            $this->error('Mailchimp is not configured. Set MAILCHIMP_API_KEY before sending test mail.');

            return self::FAILURE;
        }

        try {
            $sentAt = now()->toDateTimeString();
            $result = $mailchimp->sendCampaign(
                $recipients,
                config('app.name').' test email',
                <<<HTML
<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;">
    <p>hi</p>
    <p>This is a test email from {$sentAt}.</p>
</div>
HTML,
                'Test Hi Email '.$sentAt,
            );
        } catch (Throwable $exception) {
            $this->error('Test email failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Test email sent to: '.implode(', ', $recipients));
        $this->line('Mailchimp campaign ID: '.$result['campaign_id']);

        return self::SUCCESS;
    }
}
