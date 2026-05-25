<?php

namespace Tests\Feature\Mail;

use App\Services\Mail\MailchimpCampaignMailer;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class MailchimpCampaignMailerTest extends TestCase
{
    public function test_it_sends_default_mail_through_a_mailchimp_segmented_campaign(): void
    {
        Config::set('services.mailchimp.api_key', 'test-key-us17');
        Config::set('services.mailchimp.list_id', 'audience-123');
        Config::set('services.mailchimp.from_name', 'Alkamaris');
        Config::set('services.mailchimp.reply_to', 'sales@example.com');

        Http::fake(function (Request $request) {
            $path = (string) parse_url($request->url(), PHP_URL_PATH);

            if ($request->method() === 'POST' && $path === '/3.0/lists/audience-123/segments') {
                return Http::response(['id' => 456], 200);
            }

            if ($request->method() === 'POST' && $path === '/3.0/campaigns') {
                return Http::response(['id' => 'campaign-789'], 200);
            }

            return Http::response([], 200);
        });

        $result = app(MailchimpCampaignMailer::class)->sendCampaign(
            ['Buyer@example.com', 'buyer@example.com'],
            'Default offer',
            '<p>Hello</p>',
            'Offer title',
        );

        $this->assertSame([
            'campaign_id' => 'campaign-789',
            'recipient_count' => 1,
        ], $result);

        Http::assertSent(function (Request $request): bool {
            return $request->method() === 'PUT'
                && $request->url() === 'https://us17.api.mailchimp.com/3.0/lists/audience-123/members/' . md5('buyer@example.com')
                && $request['email_address'] === 'buyer@example.com'
                && $request['status_if_new'] === 'subscribed';
        });

        Http::assertSent(function (Request $request): bool {
            return $request->method() === 'POST'
                && $request->url() === 'https://us17.api.mailchimp.com/3.0/campaigns'
                && $request['recipients']['segment_opts']['saved_segment_id'] === 456
                && $request['settings']['subject_line'] === 'Default offer';
        });

        Http::assertSent(function (Request $request): bool {
            return $request->method() === 'PUT'
                && $request->url() === 'https://us17.api.mailchimp.com/3.0/campaigns/campaign-789/content'
                && $request['html'] === '<p>Hello</p>';
        });

        Http::assertSent(fn (Request $request): bool => $request->method() === 'POST'
            && $request->url() === 'https://us17.api.mailchimp.com/3.0/campaigns/campaign-789/actions/send');
    }
}
