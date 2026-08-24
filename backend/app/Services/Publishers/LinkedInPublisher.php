<?php

namespace App\Services\Publishers;

use App\Models\Post;
use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class LinkedInPublisher implements SocialPublisherInterface
{
    // This publisher does one plain PUT upload, not LinkedIn's chunked
    // multi-part protocol for large assets — reliable up to roughly this
    // size. Larger files would need chunked upload implemented separately.
    protected const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500MB

    public function publish(SocialAccount $account, Post $post): PublishResult
    {
        $accessToken = $account->access_token;
        $authorUrn = $account->meta['urn'] ?? null;

        if (! $accessToken || ! $authorUrn) {
            return PublishResult::fail('This LinkedIn account is missing its access token — reconnect it.');
        }

        if ($post->media_path && Storage::disk('public')->size($post->media_path) > self::MAX_UPLOAD_BYTES) {
            return PublishResult::fail('This file is too large for this app\'s LinkedIn upload — it only supports simple (non-chunked) uploads up to about 500MB.');
        }

        try {
            $mediaCategory = 'NONE';
            $media = null;

            if ($post->media_path && Storage::disk('public')->exists($post->media_path)) {
                $isVideo = $post->media_type === 'video';
                $asset = $this->uploadMedia($accessToken, $authorUrn, $post, $isVideo);

                if (! $asset) {
                    return PublishResult::fail('Could not upload the '.($isVideo ? 'video' : 'image').' to LinkedIn.');
                }

                $mediaCategory = $isVideo ? 'VIDEO' : 'IMAGE';
                $media = [[
                    'status' => 'READY',
                    'media' => $asset,
                ]];
            }

            $shareContent = [
                'shareCommentary' => ['text' => $post->content],
                'shareMediaCategory' => $mediaCategory,
            ];

            if ($media) {
                $shareContent['media'] = $media;
            }

            $response = Http::withToken($accessToken)
                ->withHeaders(['X-Restli-Protocol-Version' => '2.0.0'])
                ->post('https://api.linkedin.com/v2/ugcPosts', [
                    'author' => $authorUrn,
                    'lifecycleState' => 'PUBLISHED',
                    'specificContent' => [
                        'com.linkedin.ugc.ShareContent' => $shareContent,
                    ],
                    'visibility' => [
                        'com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC',
                    ],
                ]);

            if (! $response->successful()) {
                return PublishResult::fail($response->json('message') ?? 'Unknown LinkedIn API error.');
            }

            $postUrn = $response->header('x-restli-id') ?: $response->json('id');

            return PublishResult::ok(
                platformPostId: $postUrn,
                postUrl: $postUrn ? 'https://www.linkedin.com/feed/update/'.$postUrn.'/' : null,
            );
        } catch (\Throwable $e) {
            return PublishResult::fail($e->getMessage());
        }
    }

    protected function uploadMedia(string $accessToken, string $authorUrn, Post $post, bool $isVideo): ?string
    {
        $recipe = $isVideo ? 'feedshare-video' : 'feedshare-image';

        $registerResponse = Http::withToken($accessToken)->post('https://api.linkedin.com/v2/assets?action=registerUpload', [
            'registerUploadRequest' => [
                'recipes' => ["urn:li:digitalmediaRecipe:{$recipe}"],
                'owner' => $authorUrn,
                'serviceRelationships' => [[
                    'relationshipType' => 'OWNER',
                    'identifier' => 'urn:li:userGeneratedContent',
                ]],
            ],
        ]);

        if (! $registerResponse->successful()) {
            return null;
        }

        $uploadUrl = $registerResponse->json('value.uploadMechanism.com\.linkedin\.digitalmedia\.uploading\.MediaUploadHttpRequest.uploadUrl');
        $asset = $registerResponse->json('value.asset');

        if (! $uploadUrl || ! $asset) {
            return null;
        }

        $absolutePath = Storage::disk('public')->path($post->media_path);

        $uploadResponse = Http::withToken($accessToken)
            ->withBody(fopen($absolutePath, 'r'), 'application/octet-stream')
            ->put($uploadUrl);

        return $uploadResponse->successful() ? $asset : null;
    }
}
