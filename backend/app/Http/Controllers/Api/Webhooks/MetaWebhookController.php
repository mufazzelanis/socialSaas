<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\PlatformCredential;
use App\Models\SocialAccount;
use App\Services\Messaging\MessageIngestionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Handles both Facebook Messenger and Instagram DM webhooks — Meta
 * subscribes both under one app-level webhook URL, distinguishing them
 * only by the `object` field ("page" vs "instagram") in the POST body, so
 * one controller covers both rather than duplicating the verify/signature
 * logic twice.
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
