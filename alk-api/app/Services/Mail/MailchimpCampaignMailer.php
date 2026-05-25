<?php

namespace App\Services\Mail;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class MailchimpCampaignMailer
{
    /**
     * @param  Collection<int, string>|array<int, string>  $recipients
     * @return array{campaign_id: string, recipient_count: int}
     */
    public function sendCampaign(Collection|array $recipients, string $subject, string $html, ?string $title = null): array
    {
        $emails = collect($recipients)
            ->map(fn (string $email): string => Str::lower(trim($email)))
            ->filter()
            ->unique()
            ->values();

        if ($emails->isEmpty()) {
            throw new RuntimeException('Select at least one customer with an email address.');
        }

        $listId = $this->listId();
        $this->syncMembers($listId, $emails);

        $segmentId = $this->createStaticSegment($listId, $emails);
        $campaignId = $this->createCampaign($listId, $segmentId, $subject, $title);

        $this->setCampaignContent($campaignId, $html);
        $this->sendMailchimpCampaign($campaignId);

        return [
            'campaign_id' => $campaignId,
            'recipient_count' => $emails->count(),
        ];
    }

    public function isConfigured(): bool
    {
        return filled((string) config('services.mailchimp.api_key'));
    }

    private function syncMembers(string $listId, Collection $emails): void
    {
        foreach ($emails as $email) {
            $this->request('put', "/lists/{$listId}/members/" . md5($email), [
                'email_address' => $email,
                'status_if_new' => 'subscribed',
            ]);
        }
    }

    private function createStaticSegment(string $listId, Collection $emails): int
    {
        $name = 'Alkamaris Default Mail ' . now()->format('Y-m-d H:i:s');
        $response = $this->request('post', "/lists/{$listId}/segments", [
            'name' => $name,
            'static_segment' => $emails->all(),
        ]);

        $segmentId = (int) ($response['id'] ?? 0);

        if ($segmentId <= 0) {
            throw new RuntimeException('Mailchimp did not return a segment id.');
        }

        return $segmentId;
    }

    private function createCampaign(string $listId, int $segmentId, string $subject, ?string $title): string
    {
        $response = $this->request('post', '/campaigns', [
            'type' => 'regular',
            'recipients' => [
                'list_id' => $listId,
                'segment_opts' => [
                    'saved_segment_id' => $segmentId,
                ],
            ],
            'settings' => [
                'subject_line' => $subject,
                'title' => filled($title) ? $title : $subject,
                'from_name' => (string) config('services.mailchimp.from_name'),
                'reply_to' => (string) config('services.mailchimp.reply_to'),
            ],
        ]);

        $campaignId = (string) ($response['id'] ?? '');

        if ($campaignId === '') {
            throw new RuntimeException('Mailchimp did not return a campaign id.');
        }

        return $campaignId;
    }

    private function setCampaignContent(string $campaignId, string $html): void
    {
        $this->request('put', "/campaigns/{$campaignId}/content", [
            'html' => $html,
        ]);
    }

    private function sendMailchimpCampaign(string $campaignId): void
    {
        $this->request('post', "/campaigns/{$campaignId}/actions/send");
    }

    private function listId(): string
    {
        $configuredListId = trim((string) config('services.mailchimp.list_id'));

        if ($configuredListId !== '') {
            return $configuredListId;
        }

        $response = $this->request('get', '/lists?count=1&fields=lists.id');
        $listId = (string) data_get($response, 'lists.0.id', '');

        if ($listId === '') {
            throw new RuntimeException('Set MAILCHIMP_LIST_ID or create a Mailchimp audience before sending.');
        }

        return $listId;
    }

    /**
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, array $payload = []): array
    {
        $apiKey = (string) config('services.mailchimp.api_key');

        if ($apiKey === '') {
            throw new RuntimeException('Set MAILCHIMP_API_KEY before sending default mail.');
        }

        $response = Http::withBasicAuth('alkamaris', $apiKey)
            ->acceptJson()
            ->asJson()
            ->timeout(30)
            ->{$method}($this->baseUrl() . $path, $payload);

        $this->throwIfFailed($response);

        return $response->json() ?? [];
    }

    private function baseUrl(): string
    {
        $serverPrefix = trim((string) config('services.mailchimp.server_prefix'));
        $apiKey = (string) config('services.mailchimp.api_key');

        if ($serverPrefix === '' && str_contains($apiKey, '-')) {
            $serverPrefix = Str::afterLast($apiKey, '-');
        }

        if ($serverPrefix === '') {
            throw new RuntimeException('Set MAILCHIMP_SERVER_PREFIX or use a Mailchimp API key with a data center suffix.');
        }

        return "https://{$serverPrefix}.api.mailchimp.com/3.0";
    }

    private function throwIfFailed(Response $response): void
    {
        if ($response->successful()) {
            return;
        }

        $payload = $response->json() ?? [];
        $detail = $payload['detail'] ?? $payload['title'] ?? $response->body();

        throw new RuntimeException('Mailchimp error: ' . $detail);
    }
}
