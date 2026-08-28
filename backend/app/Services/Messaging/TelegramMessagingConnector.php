<?php

namespace App\Services\Messaging;

use App\Models\Conversation;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;

class TelegramMessagingConnector implements MessagingConnectorInterface
{
    public function sendMessage(SocialAccount $account, Conversation $conversation, string $content): SendMessageResult
    {
        $botToken = $account->access_token; // same shared bot token used for publishing

        // Replies go back into the connected chat itself (a group/channel),
        // NOT a private DM to participant_id — Telegram bots can't message
        // a user privately unless that specific user has already opened a
        // private chat with the bot, which won't be true for most people
        // posting in a monitored group. Quoting their message makes clear
        // who's being replied to even though it's posted in the group.
        $chatId = $account->account_id;

        if (! $botToken || ! $chatId) {
            return SendMessageResult::fail('Telegram bot token or chat id is missing.');
        }

        $lastInbound = $conversation->messages()
            ->where('direction', 'inbound')
            ->whereNotNull('external_message_id')
            ->latest('created_at')
            ->first();

        $payload = [
            'chat_id' => $chatId,
            'text' => $content,
        ];

        if ($lastInbound) {
            $payload['reply_to_message_id'] = $lastInbound->external_message_id;
        }

        $response = Http::timeout(15)->post("https://api.telegram.org/bot{$botToken}/sendMessage", $payload);

        $data = $response->json();

        if (! $response->successful() || empty($data['ok'])) {
            return SendMessageResult::fail($data['description'] ?? 'Unknown Telegram API error.');
        }

        $messageId = $data['result']['message_id'] ?? null;

        return SendMessageResult::ok($messageId ? (string) $messageId : null);
    }
}
