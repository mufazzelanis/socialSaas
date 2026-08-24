<?php

namespace App\Services\Publishers;

use App\Models\Post;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class FacebookPublisher implements SocialPublisherInterface
{
    // This publisher does one plain multipart upload, not Facebook's
    // resumable/chunked upload protocol — reliable for the simple upload
    // path up to roughly this size. A true multi-GB video would need the
    // chunked upload API to be implemented (a larger future addition), so
    // this fails clearly up front rather than let a huge file hang.
    protected const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1GB

    protected function version(): string
    {
        return config('social.facebook_graph_version');
    }

    protected function graphUrl(string $path): string
    {
        return "https://graph.facebook.com/{$this->version()}/{$path}";
    }

    public function publish(SocialAccount $account, Post $post): PublishResult
    {
        $pageToken = $account->access_token; // Page access token, from OAuth connect
        $pageId = $account->account_id;

        if (! $pageToken || ! $pageId) {
            return PublishResult::fail('This Facebook Page is missing its access token — reconnect it.');
        }

        $isVideo = $post->media_type === 'video';

        if ($post->media_path && Storage::disk('public')->size($post->media_path) > self::MAX_UPLOAD_BYTES) {
            return PublishResult::fail('This file is too large for this app\'s Facebook upload — it only supports simple (non-chunked) uploads up to about 1GB.');
        }

        try {
            if ($post->media_path && Storage::disk('public')->exists($post->media_path)) {
                $absolutePath = Storage::disk('public')->path($post->media_path);

                $response = Http::attach(
                    'source',
                    fopen($absolutePath, 'r'),
                    basename($absolutePath)
                )->post($this->graphUrl($isVideo ? "{$pageId}/videos" : "{$pageId}/photos"), [
                    $isVideo ? 'description' : 'caption' => $post->content,
                    'access_token' => $pageToken,
                ]);
            } else {
                $response = Http::post($this->graphUrl("{$pageId}/feed"), [
                    'message' => $post->content,
                    'access_token' => $pageToken,
                ]);
            }

            $data = $response->json();

            if (! $response->successful()) {
                return PublishResult::fail($data['error']['message'] ?? 'Unknown Facebook API error.');
            }

            $postId = $data['post_id'] ?? $data['id'] ?? null;
            $postUrl = match (true) {
                ! $postId => null,
                $isVideo => "https://www.facebook.com/{$pageId}/videos/{$postId}",
                default => "https://www.facebook.com/{$postId}",
            };

            return PublishResult::ok(platformPostId: $postId, postUrl: $postUrl);
        } catch (\Throwable $e) {
            return PublishResult::fail($e->getMessage());
        }
    }
}
