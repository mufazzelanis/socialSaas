<?php

namespace App\Services\Messaging;

use App\Models\Conversation;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;

class WhatsAppMessagingConnector implements MessagingConnectorInterface
{
    protected function version(): string
    {
        return config('social.facebook_graph_version');
    }

    public function sendMessage(SocialAccount $account, Conversation $conversation, string $content): SendMessageResult
    {
        $accessToken = $account->access_token;
        $phoneNumberId = $account->account_id;
        $to = $conversation->participant_id;

        if (! $accessToken || ! $phoneNumberId || ! $to) {
            return SendMessageResult::fail('This WhatsApp account is missing its access token or phone number id — reconnect it.');
        }

        $response = Http::withToken($accessToken)
            ->timeout(15)
            ->post("https://graph.facebook.com/{$this->version()}/{$phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'text',
                // Free-form text only works within 24 hours of the customer's
                // last message (WhatsApp's own "customer service window"
                // policy) — outside it, this call fails and only a
                // pre-approved template message would work, which this app
                // doesn't implement yet. That's WhatsApp's rule, not a bug
                // here, so the failure is surfaced as-is via SendMessageResult.
                'text' => ['body' => $content],
            ]);

        if (! $response->successful()) {
            return SendMessageResult::fail($response->json('error.message') ?? 'Unknown WhatsApp API error.');
        }

        return SendMessageResult::ok($response->json('messages.0.id'));
    }
}
