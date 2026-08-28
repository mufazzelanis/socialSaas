<?php

namespace App\Services\Messaging;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\SocialAccount;

/**
 * Shared by every platform's webhook controller — turns "a message arrived
 * for this account, from this person" into the right Conversation +
 * Message rows, so each webhook controller only has to worry about parsing
 * that platform's own payload shape, not conversation bookkeeping.
 */
class MessageIngestionService
{
    public function ingestInbound(
        SocialAccount $account,
        string $participantId,
        ?string $participantName,
        ?string $content,
        ?string $externalMessageId = null,
        ?string $mediaUrl = null,
    ): ?Message {
        $conversation = Conversation::firstOrCreate(
            ['social_account_id' => $account->id, 'participant_id' => $participantId],
            ['participant_name' => $participantName]
        );

        if ($participantName && $conversation->participant_name !== $participantName) {
            $conversation->participant_name = $participantName;
            $conversation->save();
        }

        // Platforms retry webhook deliveries that don't get acknowledged
        // fast enough — skip storing the same message twice when we can
        // tell (i.e. the platform gave us an id for it).
        if ($externalMessageId && $conversation->messages()->where('external_message_id', $externalMessageId)->exists()) {
            return null;
        }

        $message = $conversation->messages()->create([
            'direction' => 'inbound',
            'content' => $content,
            'media_url' => $mediaUrl,
            'external_message_id' => $externalMessageId,
            'status' => 'received',
        ]);

        $conversation->update([
            'last_message_at' => now(),
            'unread_count' => $conversation->unread_count + 1,
        ]);

        return $message;
    }
}
