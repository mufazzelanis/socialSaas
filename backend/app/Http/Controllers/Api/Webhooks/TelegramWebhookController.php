<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\PlatformCredential;
use App\Models\SocialAccount;
use App\Services\Messaging\MessageIngestionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function __construct(protected MessageIngestionService $ingestion)
    {
    }

    /**
     * Telegram POSTs every update (new messages, edits, etc.) here once
     * setWebhook has been called with this URL. $secret is the random value
     * from platform_credentials.webhook_secret, baked into the URL itself —
     * Telegram has no separate signing mechanism, so this is what stops
     * someone else from POSTing fake messages into a user's inbox.
     */
    public function handle(Request $request, string $secret)
    {
        $credential = PlatformCredential::where('platform', 'telegram')->first();

        if (! $credential || ! $credential->webhook_secret || ! hash_equals($credential->webhook_secret, $secret)) {
            abort(404);
        }

        $message = $request->input('message') ?? $request->input('channel_post');

        if (! $message) {
            // Other update types (edited_message, callback_query, ...) —
            // nothing to do with them yet.
            return response()->json(['ok' => true]);
        }

        $chatId = (string) ($message['chat']['id'] ?? '');

        if (! $chatId) {
            return response()->json(['ok' => true]);
        }

        // Only chats this app already knows about (a channel/group a user
        // connected for posting) map to anyone's inbox — an unsolicited
        // private DM straight to the shared bot has no way to know which
        // of this SaaS's many users it's meant for, so there's nothing
        // useful to do with it yet beyond logging it.
        $account = SocialAccount::where('platform', 'telegram')->where('account_id', $chatId)->first();

        if (! $account) {
            Log::info('Telegram webhook: message from an unconnected chat, ignored.', ['chat_id' => $chatId]);

            return response()->json(['ok' => true]);
        }

        $from = $message['from'] ?? [];
        $name = trim(($from['first_name'] ?? '').' '.($from['last_name'] ?? ''));
        if (! $name && ! empty($from['username'])) {
            $name = '@'.$from['username'];
        }

        $this->ingestion->ingestInbound(
            account: $account,
            participantId: (string) ($from['id'] ?? $chatId),
            participantName: $name ?: null,
            content: $message['text'] ?? $message['caption'] ?? null,
            externalMessageId: isset($message['message_id']) ? (string) $message['message_id'] : null,
        );

        return response()->json(['ok' => true]);
    }
}
