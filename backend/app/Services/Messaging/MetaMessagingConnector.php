<?php

namespace App\Services\Messaging;

use App\Models\Conversation;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;

/**
 * Handles both Facebook Messenger and Instagram DM — Meta unified these
 * onto the same Send API (POST /me/messages, authenticated as the Page or
 * the Instagram account's own access token), so one connector covers both
 * platforms rather than duplicating near-identical code.
 */
class MetaMessagingConnector implements MessagingConnectorInterface
{
    protected function version(): string
    {
        return config('social.facebook_graph_version');
    }

    public function sendMessage(SocialAccount $account, Conversation $conversation, string $content): SendMessageResult
    {
        $accessToken = $account->access_token;
        $recipientId = $conversation->participant_id;

        if (! $accessToken || ! $recipientId) {
            return SendMessageResult::fail('This account is missing its access token — reconnect it.');
        }

        $response = Http::timeout(15)->post("https://graph.facebook.com/{$this->version()}/me/messages", [
            'recipient' => ['id' => $recipientId],
            'message' => ['text' => $content],
            // "RESPONSE" = replying within Meta's standard messaging window
            // after the customer messaged first — the only type this app
            // needs, since it never initiates a conversation.
            'messaging_type' => 'RESPONSE',
            'access_token' => $accessToken,
        ]);

        if (! $response->successful()) {
            return SendMessageResult::fail($response->json('error.message') ?? 'Unknown Meta API error.');
        }

        return SendMessageResult::ok($response->json('message_id'));
    }
}
