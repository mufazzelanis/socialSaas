<?php

namespace App\Services\Messaging;

use App\Models\Conversation;
use App\Models\SocialAccount;

interface MessagingConnectorInterface
{
    /**
     * Send a reply into an existing conversation via that platform's own
     * Send API, authenticated as $account (the Page/bot/etc. this
     * conversation belongs to).
     */
    public function sendMessage(SocialAccount $account, Conversation $conversation, string $content): SendMessageResult;
}
