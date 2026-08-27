<?php

namespace App\Services\Publishers;

use App\Models\Post;
use App\Models\SocialAccount;
use Illuminate\Support\Collection;
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

    public function publish(SocialAccount $account, Post $post, string $content): PublishResult
    {
        $botToken = $account->access_token; // bot token stored here
        $chatId = $account->account_id;     // channel/chat id stored here

        if (! $botToken || ! $chatId) {
            return PublishResult::fail('Telegram bot token or chat id is missing.');
        }

        $items = $post->mediaItems()->filter(fn (array $item) => Storage::disk('public')->exists($item['path']));

        foreach ($items as $item) {
            if (Storage::disk('public')->size($item['path']) > self::MAX_UPLOAD_BYTES) {
                return PublishResult::fail('This file is too large for Telegram — its Bot API only accepts files up to 50MB, regardless of the size allowed elsewhere in this app.');
            }
        }

        try {
            if ($items->count() > 1) {
                return $this->publishMediaGroup($account, $botToken, $chatId, $items, $content);
            }

            if ($items->isNotEmpty()) {
                $item = $items->first();
                $isVideo = $item['type'] === 'video';
                $field = $isVideo ? 'video' : 'photo';
                $endpoint = "https://api.telegram.org/bot{$botToken}/".($isVideo ? 'sendVideo' : 'sendPhoto');
                $absolutePath = Storage::disk('public')->path($item['path']);

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
                    ['name' => 'caption', 'contents' => $content],
                ]);
            } else {
                $endpoint = "https://api.telegram.org/bot{$botToken}/sendMessage";

                $response = Http::post($endpoint, [
                    'chat_id' => $chatId,
                    'text' => $content,
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

    /**
     * Sends 2-10 items in one message via sendMediaGroup — Telegram only
     * shows the caption on the FIRST item, the rest go captionless (that's
     * the API's own behaviour, not a limitation of this code).
     */
    protected function publishMediaGroup(SocialAccount $account, string $botToken, string $chatId, Collection $items, string $content): PublishResult
    {
        $endpoint = "https://api.telegram.org/bot{$botToken}/sendMediaGroup";
        $mediaDescriptor = [];
        $request = Http::asMultipart();

        foreach ($items->values() as $i => $item) {
            $isVideo = $item['type'] === 'video';
            $attachName = "item{$i}";

            $entry = ['type' => $isVideo ? 'video' : 'photo', 'media' => "attach://{$attachName}"];
            if ($i === 0) {
                $entry['caption'] = $content;
            }
            $mediaDescriptor[] = $entry;

            $absolutePath = Storage::disk('public')->path($item['path']);
            $request = $request->attach($attachName, fopen($absolutePath, 'r'), basename($absolutePath));
        }

        $response = $request->post($endpoint, [
            ['name' => 'chat_id', 'contents' => $chatId],
            ['name' => 'media', 'contents' => json_encode($mediaDescriptor)],
        ]);

        $data = $response->json();

        if (! $response->successful() || empty($data['ok'])) {
            return PublishResult::fail($data['description'] ?? 'Unknown Telegram API error.');
        }

        // sendMediaGroup returns one Message per item — link/report the first.
        $messageId = $data['result'][0]['message_id'] ?? null;

        return PublishResult::ok(
            platformPostId: $messageId ? (string) $messageId : null,
            postUrl: $this->buildPostUrl($account, $messageId),
        );
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
