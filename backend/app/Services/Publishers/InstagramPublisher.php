<?php

namespace App\Services\Publishers;

use App\Models\Post;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class InstagramPublisher implements SocialPublisherInterface
{
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
        $accessToken = $account->access_token; // the linked Facebook Page's token
        $igUserId = $account->account_id;

        if (! $accessToken || ! $igUserId) {
            return PublishResult::fail('This Instagram account is missing its access token — reconnect it.');
        }

        if (! $post->media_path || ! Storage::disk('public')->exists($post->media_path)) {
            return PublishResult::fail('Instagram requires an image or video attached to the post — text-only posts are not supported.');
        }

        $isVideo = $post->media_type === 'video';

        // Instagram's publishing API fetches the media itself from a public
        // URL (no direct file upload) — so this only works once the app is
        // reachable over the internet. On localhost this step will fail;
        // that's expected until this is deployed behind a real domain.
        $mediaUrl = Storage::disk('public')->url($post->media_path);

        try {
            // Step 1: create a media container.
            $containerParams = [
                'caption' => $post->content,
                'access_token' => $accessToken,
            ];
            $containerParams[$isVideo ? 'video_url' : 'image_url'] = $mediaUrl;
            if ($isVideo) {
                $containerParams['media_type'] = 'REELS';
            }

            $containerResponse = Http::post($this->graphUrl("{$igUserId}/media"), $containerParams);

            $containerData = $containerResponse->json();

            if (! $containerResponse->successful() || empty($containerData['id'])) {
                $message = $containerData['error']['message'] ?? 'Could not create the Instagram media container.';

                if (str_contains($mediaUrl, 'localhost') || str_contains($mediaUrl, '127.0.0.1')) {
                    $message .= ' (Instagram needs to fetch the media over the public internet — this will work once the app is deployed to a real domain; it cannot reach localhost.)';
                }

                return PublishResult::fail($message);
            }

            // Videos need time to process on Instagram's side before they
            // can be published — poll status_code until it's ready. This
            // blocks the request for up to ~30s; once background queue
            // publishing exists (planned), this should move off the request.
            if ($isVideo) {
                $ready = $this->waitForVideoProcessing($accessToken, $containerData['id']);

                if (! $ready) {
                    return PublishResult::fail('Instagram is still processing this video — try publishing again in a minute.');
                }
            }

            // Step 2: publish the container.
            $publishResponse = Http::post($this->graphUrl("{$igUserId}/media_publish"), [
                'creation_id' => $containerData['id'],
                'access_token' => $accessToken,
            ]);

            $publishData = $publishResponse->json();

            if (! $publishResponse->successful() || empty($publishData['id'])) {
                return PublishResult::fail($publishData['error']['message'] ?? 'Could not publish the Instagram post.');
            }

            $mediaId = $publishData['id'];
            $postUrl = $this->buildPostUrl($accessToken, $mediaId);

            return PublishResult::ok(platformPostId: $mediaId, postUrl: $postUrl);
        } catch (\Throwable $e) {
            return PublishResult::fail($e->getMessage());
        }
    }

    protected function waitForVideoProcessing(string $accessToken, string $containerId, int $maxAttempts = 10, int $delaySeconds = 3): bool
    {
        for ($i = 0; $i < $maxAttempts; $i++) {
            sleep($delaySeconds);

            $response = Http::get($this->graphUrl($containerId), [
                'fields' => 'status_code',
                'access_token' => $accessToken,
            ]);

            $status = $response->json('status_code');

            if ($status === 'FINISHED') {
                return true;
            }

            if ($status === 'ERROR') {
                return false;
            }
            // else IN_PROGRESS — keep polling.
        }

        return false;
    }

    protected function buildPostUrl(string $accessToken, string $mediaId): ?string
    {
        $response = Http::get($this->graphUrl($mediaId), [
            'fields' => 'permalink',
            'access_token' => $accessToken,
        ]);

        return $response->successful() ? $response->json('permalink') : null;
    }
}
