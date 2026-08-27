<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Services\PostPublishingService;
use Illuminate\Console\Command;

class PublishDuePosts extends Command
{
    protected $signature = 'posts:publish-due';

    protected $description = 'Publish every scheduled post whose scheduled time has arrived.';

    public function handle(PostPublishingService $publishingService): int
    {
        $due = Post::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->get();

        if ($due->isEmpty()) {
            $this->info('No scheduled posts are due.');

            return self::SUCCESS;
        }

        foreach ($due as $post) {
            $this->info("Publishing scheduled post #{$post->id}...");
            $publishingService->publishPost($post);
        }

        return self::SUCCESS;
    }
}
