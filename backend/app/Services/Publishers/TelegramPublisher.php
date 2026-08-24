<?php

namespace App\Services\Publishers;

use App\Models\Post;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class TelegramPublisher implements SocialPublisherInterface
{
    // Telegram's public Bot API (api.telegram.org) hard-caps file uploads at
    // 50MB regardless of what our own app allows — this isn't a setting we
    // control. (A self-hosted Local Bot API Server raises this to 2GB, but
    // this app doesn't run one.) Checked up front so this fails with a clear
    // reason instead of a confusing error partway through a large upload.
    protected const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

    public function publish(SocialAccount $account, Post $post): PublishResult
    {
        $botToken = $account->access_token; // bot token stored here
        $chatId = $account->account_id;     // channel/chat id stored here

        if (! $botToken || ! $chatId) {
            return PublishResult::fail('Telegram bot token or chat id is missing.');
        }

        if ($post->media_path && Storage::disk('public')->size($post->media_path) > self::MAX_UPLOAD_BYTES) {
            return PublishResult::fail('This file is too large for Telegram — its Bot API only accepts files up to 50MB, regardless of the size allowed elsewhere in this app.');
        }

        try {
            if ($post->media_path && Storage::disk('public')->exists($post->media_path)) {
                $isVideo = $post->media_type === 'video';
                $field = $isVideo ? 'video' : 'photo';
                $endpoint = "https://api.telegram.org/bot{$botToken}/".($isVideo ? 'sendVideo' : 'sendPhoto');
                $absolutePath = Storage::disk('public')->path($post->media_path);

                // Stream the file rather than loading it into memory —
                // important now that uploads can be large (up to 2GB
                // elsewhere in the app, even though Telegram itself caps
                // at 50MB above).
                $response = Http::attach(
                    $field,
                    fopen($absolutePath, 'r'),
                    basename($absolutePath)
                )->asMultipart()->post($endpoint, [
                    ['name' => 'chat_id', 'contents' => $chatId],
                    ['name' => 'caption', 'contents' => $post->content],
                ]);
            } else {
                $endpoint = "https://api.telegram.org/bot{$botToken}/sendMessage";

                $response = Http::post($endpoint, [
                    'chat_id' => $chatId,
                    'text' => $post->content,
                ]);
            }

            $data = $response->json();

            if (! $response->successful() || empty($data['ok'])) {
                $error = $data['description'] ?? 'Unknown Telegram API error.';

                return PublishResult::fail($error);
            }

            $messageId = $data['result']['message_id'] ?? null;
            $postUrl = $this->buildPostUrl($account, $messageId);

            return PublishResult::ok(
                platformPostId: $messageId ? (string) $messageId : null,
                postUrl: $postUrl,
            );
        } catch (\Throwable $e) {
            return PublishResult::fail($e->getMessage());
        }
    }

    protected function buildPostUrl(SocialAccount $account, ?int $messageId): ?string
    {
        if (! $messageId) {
            return null;
        }

        // Public channels have a @username we can link to; private chats cannot be linked.
        $username = $account->meta['username'] ?? null;

        if ($username) {
            $username = ltrim($username, '@');

            return "https://t.me/{$username}/{$messageId}";
        }

        return null;
    }
}
