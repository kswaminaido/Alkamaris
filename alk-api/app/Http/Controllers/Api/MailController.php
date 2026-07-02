<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use App\Services\Audit\UserEventLogger;
use App\Services\Mail\MailchimpCampaignMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class MailController extends Controller
{
    public function __construct(
        private readonly UserEventLogger $userEventLogger,
    ) {}

    public function options(): JsonResponse
    {
        return response()->json([
            'data' => [
                'products' => TransactionItem::query()
                    ->whereNotNull('product')
                    ->where('product', '<>', '')
                    ->distinct()
                    ->orderBy('product')
                    ->pluck('product')
                    ->values(),
            ],
        ]);
    }

    public function recipients(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'scol' => ['nullable', 'boolean'],
            'exhibition' => ['nullable', 'boolean'],
            'defaultMail' => ['nullable', 'boolean'],
            'taxiMail' => ['nullable', 'boolean'],
            'product' => ['nullable', 'string', 'max:255'],
            'continents' => ['nullable', 'array'],
            'continents.*' => ['string', 'max:100'],
            'countries' => ['nullable', 'array'],
            'countries.*' => ['string', 'max:100'],
            'style' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'in:all_exhibition,scol'],
            'rating' => ['nullable', 'string', 'max:50'],
            'years' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $customerUsers = User::query()
            ->where('role', 'customer')
            ->get(['id', 'name', 'email', 'address', 'created_at'])
            ->keyBy(fn (User $user): string => Str::lower(trim($user->name)));

        $query = Transaction::query()
            ->with(['generalInfoCustomer:transaction_id,customer', 'items:transaction_id,product,style'])
            ->whereHas('generalInfoCustomer', fn ($q) => $q->whereNotNull('customer')->where('customer', '<>', ''));

        if (! empty($filters['product'])) {
            $product = $filters['product'];
            $query->whereHas('items', fn ($q) => $q->where('product', 'like', "%{$product}%"));
        }

        if (! empty($filters['style'])) {
            $style = $filters['style'];
            $query->whereHas('items', fn ($q) => $q->where('style', 'like', "%{$style}%"));
        }

        if (! empty($filters['years'])) {
            $query->where('created_at', '>=', now()->subYears((int) $filters['years']));
        }

        $countryFilter = array_values(array_filter((array) ($filters['countries'] ?? []), fn ($value) => is_string($value) && trim($value) !== ''));

        $recipients = $query
            ->orderByDesc('created_at')
            ->get()
            ->groupBy(fn (Transaction $transaction): string => trim((string) $transaction->generalInfoCustomer?->customer))
            ->map(function ($transactions, string $customerName) use ($customerUsers, $countryFilter): array {
                $first = $transactions->first();
                $user = $customerUsers->get(Str::lower($customerName));

                $detectedCountry = $this->detectCountry($user?->address ?? $first?->country);
                if ($countryFilter !== [] && ! in_array($detectedCountry, $countryFilter, true)) {
                    return [];
                }

                return [
                    'id' => md5($customerName.'|'.($user?->email ?? '')),
                    'name' => $customerName,
                    'email' => $user?->email,
                    'country' => $detectedCountry ?? $first?->country,
                    'products' => $transactions
                        ->flatMap(fn (Transaction $transaction) => $transaction->items->pluck('product'))
                        ->filter()
                        ->unique()
                        ->values()
                        ->all(),
                    'last_booking_at' => optional($first?->created_at)->format('Y-m-d'),
                    'source' => 'SCOL',
                ];
            })
            ->filter()
            ->values();

        if (($filters['scol'] ?? false) && empty($filters['product']) && empty($filters['style'])) {
            $existingEmails = $recipients->pluck('email')->filter()->map(fn (string $email): string => Str::lower($email))->all();
            $customerUsers->values()->each(function (User $user) use (&$recipients, $existingEmails, $countryFilter): void {
                if (! in_array(Str::lower($user->email), $existingEmails, true)) {
                    $detectedCountry = $this->detectCountry($user->address);
                    if ($countryFilter !== [] && ! in_array($detectedCountry, $countryFilter, true)) {
                        return;
                    }

                    $recipients->push([
                        'id' => (string) $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'country' => $detectedCountry,
                        'products' => [],
                        'last_booking_at' => optional($user->created_at)->format('Y-m-d'),
                        'source' => 'SCOL',
                    ]);
                }
            });
        }

        if (! empty($countryFilter ?? [])) {
            $recipients = $recipients->filter(fn (array $recipient): bool => in_array($recipient['country'] ?? null, $countryFilter, true));
        }

        return response()->json(['data' => $recipients->sortBy('name')->values()]);
    }

    public function send(Request $request, MailchimpCampaignMailer $mailchimp): JsonResponse
    {
        $validated = $request->validate([
            'recipients' => ['required', 'array', 'min:1'],
            'recipients.*' => ['required', 'email'],
            'title' => ['nullable', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'body_html' => ['nullable', 'boolean'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'max:10240'],
        ]);

        $recipients = collect($validated['recipients'])->unique()->values();
        $html = $this->buildHtmlMail(
            $validated['title'] ?? '',
            $validated['body'],
            (bool) ($validated['body_html'] ?? false),
        );
        $attachments = $request->file('attachments', []);

        if ($mailchimp->isConfigured()) {
            if (count($attachments) > 0) {
                throw ValidationException::withMessages([
                    'attachments' => ['Mailchimp default mail does not support file attachments. Add images inside the message body instead.'],
                ]);
            }

            try {
                $mailchimp->sendCampaign(
                    $recipients,
                    $validated['subject'],
                    $html,
                    $validated['title'] ?? null,
                );
            } catch (RuntimeException $exception) {
                return response()->json(['message' => $exception->getMessage()], 422);
            }

            $this->userEventLogger->log(
                $request->user(),
                'Mail',
                'Mail sent',
                null,
                newValues: [
                    'delivery' => 'mailchimp',
                    'recipient_count' => $recipients->count(),
                    'subject' => $validated['subject'],
                    'title' => $validated['title'] ?? null,
                ],
                description: 'Mail sent through Mailchimp',
            );

            return response()->json([
                'message' => 'Mail sent successfully to '.$recipients->count().' customer(s) through Mailchimp.',
            ]);
        }

        foreach ($recipients as $email) {
            Mail::html($html, function ($message) use ($email, $validated, $attachments): void {
                $message->to($email)->subject($validated['subject']);

                foreach ($attachments as $attachment) {
                    $message->attach(
                        $attachment->getRealPath(),
                        ['as' => $attachment->getClientOriginalName(), 'mime' => $attachment->getMimeType()],
                    );
                }
            });
        }

        $this->userEventLogger->log(
            $request->user(),
            'Mail',
            'Mail sent',
            null,
            newValues: [
                'delivery' => 'smtp',
                'recipient_count' => $recipients->count(),
                'subject' => $validated['subject'],
                'title' => $validated['title'] ?? null,
                'attachment_count' => count($attachments),
            ],
            description: 'Mail sent through SMTP',
        );

        return response()->json([
            'message' => 'Mail sent successfully to '.$recipients->count().' customer(s).',
        ]);
    }

    private function detectCountry(?string $address): ?string
    {
        if (blank($address)) {
            return null;
        }

        $normalized = Str::lower($address);

        $countryMap = [
            'Hong Kong' => ['hong kong', 'hongkong', 'hk'],
            'India' => ['india', 'in '],
            'Singapore' => ['singapore', 'sg'],
            'United Arab Emirates' => ['united arab emirates', 'uae', 'dubai', 'abu dhabi'],
            'Jordan' => ['jordan', 'jo'],
            'Netherlands' => ['netherlands', 'holland', 'nl'],
            'Vietnam' => ['vietnam', 'vn'],
            'China' => ['china', 'cn'],
            'Bangladesh' => ['bangladesh', 'bd'],
            'Malaysia' => ['malaysia', 'my'],
            'Philippines' => ['philippines', 'ph'],
            'Saudi Arabia' => ['saudi arabia', 'saudi', 'sa'],
            'South Korea' => ['south korea', 'korea', 'kr'],
            'Sri Lanka' => ['sri lanka', 'lk'],
            'Thailand' => ['thailand', 'th'],
            'Japan' => ['japan', 'jp'],
            'Indonesia' => ['indonesia', 'id'],
            'Pakistan' => ['pakistan', 'pk'],
            'United Kingdom' => ['united kingdom', 'uk', 'england', 'britain'],
            'United States' => ['united states', 'usa', 'us'],
            'Canada' => ['canada', 'ca'],
            'Australia' => ['australia', 'au'],
            'New Zealand' => ['new zealand', 'nz'],
            'Germany' => ['germany', 'de'],
            'France' => ['france', 'fr'],
            'Italy' => ['italy', 'it'],
            'Spain' => ['spain', 'es'],
            'Belgium' => ['belgium', 'be'],
        ];

        foreach ($countryMap as $country => $keywords) {
            foreach ($keywords as $keyword) {
                if (Str::contains($normalized, $keyword)) {
                    return $country;
                }
            }
        }

        return null;
    }

    private function buildHtmlMail(string $title, string $body, bool $bodyIsHtml): string
    {
        $titleHtml = trim($title) !== '' ? '<h2>'.e($title).'</h2>' : '';
        $bodyHtml = $bodyIsHtml ? $this->cleanComposeHtml($body) : nl2br(e($body));

        return '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;">'
            .$titleHtml
            .'<div>'.$bodyHtml.'</div>'
            .'</div>';
    }

    private function cleanComposeHtml(string $html): string
    {
        $withoutScripts = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? '';
        $withoutEventHandlers = preg_replace('/\son[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $withoutScripts) ?? '';

        return $withoutEventHandlers;
    }
}
