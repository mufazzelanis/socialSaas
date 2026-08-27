<?php

namespace App\Services;

use App\Models\Post;
use App\Models\PostPlatform;
use App\Services\Publishers\PublisherFactory;

/**
 * All the "actually talk to the platform APIs and record what happened"
 * logic for a post, extracted out of PostController so it can be triggered
 * from more than one place — a synchronous HTTP request (Publish Now) and
 * the `posts:publish-due` scheduler command both need the exact same
 * publish/status-refresh behaviour.
 */
class PostPublishingService
{
    public function publishPost(Post $post): void
    {
        $post->update(['status' => 'publishing']);

        foreach ($post->platforms as $postPlatform) {
            $this->publishToOnePlatform($postPlatform);
        }

        $this->refreshPostStatus($post);
    }

    public function publishToOnePlatform(PostPlatform $postPlatform): void
    {
        $post = $postPlatform->post;
        $account = $postPlatform->socialAccount;

        if (! $post->user->hasPlatformPermission($postPlatform->platform)) {
            $postPlatform->update([
                'status' => 'failed',
                'error_message' => 'Permission for this platform was revoked.',
            ]);

            return;
        }

        try {
            $publisher = PublisherFactory::make($postPlatform->platform);
            $result = $publisher->publish($account, $post);

            if ($result->success) {
                $postPlatform->update([
                    'status' => 'published',
                    'platform_post_id' => $result->platformPostId,
                    'post_url' => $result->postUrl,
                    'error_message' => null,
                    'published_at' => now(),
                ]);
            } else {
                $postPlatform->update([
                    'status' => 'failed',
                    'error_message' => $result->errorMessage,
                ]);
            }
        } catch (\Throwable $e) {
            $postPlatform->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }
    }

    public function refreshPostStatus(Post $post): void
    {
        $statuses = $post->platforms()->pluck('status');

        $status = match (true) {
            $statuses->every(fn ($s) => $s === 'published') => 'published',
            $statuses->contains('published') => 'partial',
            default => 'failed',
        };

        $post->update([
            'status' => $status,
            'published_at' => $status !== 'failed' ? now() : null,
        ]);

        ActivityLogger::log($post->user, "post_{$status}", "Post #{$post->id} finished publishing with status [{$status}].", ['post_id' => $post->id]);
    }
}
