<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\PlatformCredential;
use App\Models\SocialAccount;
use App\Services\Messaging\MessageIngestionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Handles Facebook Messenger, Instagram DM, AND WhatsApp webhooks — Meta
 * subscribes all three under one app-level webhook URL, distinguishing them
 * only by the `object` field ("page", "instagram", or
 * "whatsapp_business_account") in the POST body, so one controller covers
 * all of them rather than duplicating the verify/signature logic three
 * times. WhatsApp's own payload shape (entry[].changes[].value...) is
 * different enough from Messenger/Instagram's (entry[].messaging[]) that
 * it gets its own parsing method rather than being forced into the same
 * shape.
 */
class MetaWebhookController extends Controller
{
    public function __construct(protected MessageIngestionService $ingestion)
    {
    }

    /**
     * Meta's one-time verification handshake, done when the webhook URL is
     * first configured (and whenever it's re-verified) in the Meta App
     * Dashboard. Must echo back hub_challenge verbatim, and ONLY if
     * hub_verify_token matches what we generated — otherwise anyone could
     * point their own Meta app's webhook at this URL.
     */
    public function verify(Request $request)
    {
        $credential = PlatformCredential::where('platform', 'facebook')->first();

        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $credential?->webhook_secret && hash_equals($credential->webhook_secret, (string) $token)) {
            return response($challenge, 200);
        }

        abort(403);
    }

    public function handle(Request $request)
    {
        $credential = PlatformCredential::where('platform', 'facebook')->first();

        if (! $this->verifySignature($request, $credential?->client_secret)) {
            abort(403);
        }

        $object = $request->input('object');

        if ($object === 'whatsapp_business_account') {
            $this->handleWhatsappEntries($request->input('entry', []));

            return response()->json(['ok' => true]);
        }

        $platform = match ($object) {
            'page' => 'facebook',
            'instagram' => 'instagram',
            default => null,
        };

        if (! $platform) {
            return response()->json(['ok' => true]);
        }

        foreach ($request->input('entry', []) as $entry) {
            $ourAccountId = (string) ($entry['id'] ?? '');

            foreach ($entry['messaging'] ?? [] as $event) {
                // Meta also fires this webhook for delivery/read receipts
                // and our own echoed-back outbound messages — only an
                // actual inbound message has this key.
                if (empty($event['message']) || ! empty($event['message']['is_echo'])) {
                    continue;
                }

                $this->handleMessageEvent($platform, $ourAccountId, $event);
            }
        }

        return response()->json(['ok' => true]);
    }

    protected function handleMessageEvent(string $platform, string $ourAccountId, array $event): void
    {
        $account = SocialAccount::where('platform', $platform)->where('account_id', $ourAccountId)->first();

        if (! $account) {
            Log::info('Meta webhook: message for an unconnected account, ignored.', ['platform' => $platform, 'account_id' => $ourAccountId]);

            return;
        }

        $senderId = (string) ($event['sender']['id'] ?? '');

        if (! $senderId) {
            return;
        }

        $this->ingestion->ingestInbound(
            account: $account,
            participantId: $senderId,
            participantName: null, // fetched lazily via the Graph API when the inbox UI needs it, not stored per-message
            content: $event['message']['text'] ?? null,
            externalMessageId: $event['message']['mid'] ?? null,
            mediaUrl: $event['message']['attachments'][0]['payload']['url'] ?? null,
        );
    }

    /**
     * WhatsApp nests everything under entry[].changes[].value — a whole
     * different shape from Messenger/Instagram's entry[].messaging[], and
     * the same webhook also fires for delivery/read status updates (under
     * value.statuses instead of value.messages), which this skips.
     */
    protected function handleWhatsappEntries(array $entries): void
    {
        foreach ($entries as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value = $change['value'] ?? [];
                $phoneNumberId = $value['metadata']['phone_number_id'] ?? null;

                if (! $phoneNumberId || empty($value['messages'])) {
                    continue;
                }

                $account = SocialAccount::where('platform', 'whatsapp')->where('account_id', $phoneNumberId)->first();

                if (! $account) {
                    Log::info('Meta webhook: WhatsApp message for an unconnected number, ignored.', ['phone_number_id' => $phoneNumberId]);

                    continue;
                }

                $contactNames = collect($value['contacts'] ?? [])
                    ->keyBy('wa_id')
                    ->map(fn (array $c) => $c['profile']['name'] ?? null);

                foreach ($value['messages'] as $message) {
                    $from = $message['from'] ?? null;

                    if (! $from) {
                        continue;
                    }

                    $this->ingestion->ingestInbound(
                        account: $account,
                        participantId: $from,
                        participantName: $contactNames->get($from),
                        content: $message['text']['body'] ?? null,
                        externalMessageId: $message['id'] ?? null,
                    );
                }
            }
        }
    }

    /**
     * Every POST to a Meta webhook is signed with the app secret — verifying
     * it (rather than just trusting the URL is secret) is Meta's own
     * documented requirement, and catches anyone who discovers the
     * endpoint URL some other way.
     */
    protected function verifySignature(Request $request, ?string $appSecret): bool
    {
        if (! $appSecret) {
            return false;
        }

        $header = $request->header('X-Hub-Signature-256', '');

        if (! str_starts_with($header, 'sha256=')) {
            return false;
        }

        $expected = hash_hmac('sha256', $request->getContent(), $appSecret);

        return hash_equals($expected, substr($header, 7));
    }
}
