<?php

namespace App\Services\Publishers;

use App\Models\Post;
use App\Models\SocialAccount;

interface SocialPublisherInterface
{
    /**
     * Publish a post to this platform using the given connected account.
     */
    public function publish(SocialAccount $account, Post $post): PublishResult;
}
