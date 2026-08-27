<?php

namespace App\Services\Publishers;

use App\Models\Post;
use App\Models\SocialAccount;

interface SocialPublisherInterface
{
    /**
     * Publish a post to this platform using the given connected account.
     *
     * $content is what should actually be sent — the post's shared content,
     * or that platform's own override if the composer customized it — so
     * publishers never read $post->content directly.
     */
    public function publish(SocialAccount $account, Post $post, string $content): PublishResult;
}
