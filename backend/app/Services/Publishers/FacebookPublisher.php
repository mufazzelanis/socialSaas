<?php

namespace App\Services\Publishers;

use App\Models\Post;
use App\Models\SocialAccount;
use Illuminate\Support\Collection;
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

    public function publish(SocialAccount $account, Post $post, string $content): PublishResult
    {
        $pageToken = $account->access_token; // Page access token, from OAuth connect
        $pageId = $account->account_id;

        if (! $pageToken || ! $pageId) {
            return PublishResult::fail('This Facebook Page is missing its access token — reconnect it.');
        }

        $items = $post->mediaItems()->filter(fn (array $item) => Storage::disk('public')->exists($item['path']));

        foreach ($items as $item) {
            if (Storage::disk('public')->size($item['path']) > self::MAX_UPLOAD_BYTES) {
                return PublishResult::fail('This file is too large for this app\'s Facebook upload — it only supports simple (non-chunked) uploads up to about 1GB.');
            }
        }

        // Facebook's multi-photo album flow (unpublished photo uploads +
        // attached_media on /feed) only accepts photos. A mixed or
        // video-only multi-item post falls back to just its first item —
        // the same single-media path this publisher has always had.
        $allImages = $items->isNotEmpty() && $items->every(fn (array $item) => $item['type'] === 'image');

        try {
            if ($items->count() > 1 && $allImages) {
                return $this->publishAlbum($pageId, $pageToken, $items, $content);
            }

            $item = $items->first();
            $isVideo = $item && $item['type'] === 'video';

            if ($item) {
                $absolutePath = Storage::disk('public')->path($item['path']);

                $response = Http::attach(
                    'source',
                    fopen($absolutePath, 'r'),
                    basename($absolutePath)
                )->post($this->graphUrl($isVideo ? "{$pageId}/videos" : "{$pageId}/photos"), [
                    $isVideo ? 'description' : 'caption' => $content,
                    'access_token' => $pageToken,
                ]);
            } else {
                $response = Http::post($this->graphUrl("{$pageId}/feed"), [
                    'message' => $content,
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

    /**
     * Multi-photo album: each photo is uploaded unpublished first (no
     * standalone post created for it), then one /feed post attaches all of
     * them together via attached_media.
     */
    protected function publishAlbum(string $pageId, string $pageToken, Collection $items, string $content): PublishResult
    {
        $photoIds = [];

        foreach ($items as $item) {
            $absolutePath = Storage::disk('public')->path($item['path']);

            $response = Http::attach(
                'source',
                fopen($absolutePath, 'r'),
                basename($absolutePath)
            )->post($this->graphUrl("{$pageId}/photos"), [
                'published' => 'false',
                'access_token' => $pageToken,
            ]);

            $data = $response->json();

            if (! $response->successful() || empty($data['id'])) {
                return PublishResult::fail($data['error']['message'] ?? 'Could not upload one of the images to Facebook.');
            }

            $photoIds[] = $data['id'];
        }

        $attachedMedia = array_map(fn ($id) => ['media_fbid' => $id], $photoIds);

        $response = Http::post($this->graphUrl("{$pageId}/feed"), [
            'message' => $content,
            'attached_media' => json_encode($attachedMedia),
            'access_token' => $pageToken,
        ]);

        $data = $response->json();

        if (! $response->successful()) {
            return PublishResult::fail($data['error']['message'] ?? 'Unknown Facebook API error.');
        }

        $postId = $data['post_id'] ?? $data['id'] ?? null;

        return PublishResult::ok(
            platformPostId: $postId,
            postUrl: $postId ? "https://www.facebook.com/{$postId}" : null,
        );
    }
}
