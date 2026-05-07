<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class MailController extends Controller
{
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

        if (! empty($filters['countries'])) {
            $query->whereIn('country', $filters['countries']);
        }

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

        $recipients = $query
            ->orderByDesc('created_at')
            ->get()
            ->groupBy(fn (Transaction $transaction): string => trim((string) $transaction->generalInfoCustomer?->customer))
            ->map(function ($transactions, string $customerName) use ($customerUsers): array {
                $first = $transactions->first();
                $user = $customerUsers->get(Str::lower($customerName));

                return [
                    'id' => md5($customerName . '|' . ($user?->email ?? '')),
                    'name' => $customerName,
                    'email' => $user?->email,
                    'country' => $first?->country,
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
            ->values();

        if (($filters['scol'] ?? false) && empty($filters['product']) && empty($filters['style']) && empty($filters['countries'])) {
            $existingEmails = $recipients->pluck('email')->filter()->map(fn (string $email): string => Str::lower($email))->all();
            $customerUsers->values()->each(function (User $user) use (&$recipients, $existingEmails): void {
                if (! in_array(Str::lower($user->email), $existingEmails, true)) {
                    $recipients->push([
                        'id' => (string) $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'country' => $user->address,
                        'products' => [],
                        'last_booking_at' => optional($user->created_at)->format('Y-m-d'),
                        'source' => 'SCOL',
                    ]);
                }
            });
        }

        return response()->json(['data' => $recipients->sortBy('name')->values()]);
    }

    public function send(Request $request): JsonResponse
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

        return response()->json([
            'message' => 'Mail sent successfully to ' . $recipients->count() . ' customer(s).',
        ]);
    }

    private function buildHtmlMail(string $title, string $body, bool $bodyIsHtml): string
    {
        $titleHtml = trim($title) !== '' ? '<h2>' . e($title) . '</h2>' : '';
        $bodyHtml = $bodyIsHtml ? $this->cleanComposeHtml($body) : nl2br(e($body));

        return '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;">'
            . $titleHtml
            . '<div>' . $bodyHtml . '</div>'
            . '</div>';
    }

    private function cleanComposeHtml(string $html): string
    {
        $withoutScripts = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? '';
        $withoutEventHandlers = preg_replace('/\son[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $withoutScripts) ?? '';

        return $withoutEventHandlers;
    }
}
