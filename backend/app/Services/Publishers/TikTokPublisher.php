<?php

namespace App\Services\Publishers;

use App\Models\PlatformCredential;
use App\Models\Post;
use App\Models\SocialAccount;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Publishes via TikTok's Content Posting API (Direct Post, FILE_UPLOAD
 * source) — a straight upload of one video to the connected creator's own
 * profile. Two things make this publisher shaped differently from the
 * others:
 *
 *  - TikTok only accepts video through this API (no text-only or
 *    image-only posts), so publish() looks specifically for a video
 *    among the post's media rather than "any attachment".
 *  - TikTok access tokens last only ~24h (refresh tokens last a year), so
 *    every publish call first makes sure the token is still fresh — see
 *    ensureFreshToken() — instead of assuming whatever's stored is valid.
 */
class TikTokPublisher implements SocialPublisherInterface
{
    protected const API = 'https://open.tiktokapis.com/v2';

    // Single-chunk upload only — TikTok allows a video up to this size to
    // go up as one piece. Bigger files need TikTok's separate multi-chunk
    // protocol, which isn't implemented here (same simplification the
    // LinkedIn publisher makes for its own upload size cap).
    protected const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;

    // How many times (and how long between) to poll TikTok for the publish
    // result before treating it as "still processing" rather than waiting
    // indefinitely — TikTok finishes this asynchronously in the background.
    protected const STATUS_POLL_ATTEMPTS = 5;

    protected const STATUS_POLL_DELAY_SECONDS = 3;

    public function publish(SocialAccount $account, Post $post, string $content): PublishResult
    {
        $item = $post->mediaItems()->first(fn (array $item) => ($item['type'] ?? null) === 'video');

        if (! $item || ! Storage::disk('public')->exists($item['path'])) {
            return PublishResult::fail('TikTok requires a video attached to publish — add a video and try again.');
        }

        $size = Storage::disk('public')->size($item['path']);

        if ($size > self::MAX_UPLOAD_BYTES) {
            return PublishResult::fail("This video is too large for this app's TikTok upload — it only supports single-part uploads up to 64MB.");
        }

        try {
            $accessToken = $this->ensureFreshToken($account);
        } catch (\Throwable $e) {
            return PublishResult::fail("Could not refresh this TikTok account's access — reconnect it. (".$e->getMessage().')');
        }

        try {
            $privacyLevel = $this->queryPrivacyLevel($accessToken);

            $initResponse = Http::withToken($accessToken)->post(self::API.'/post/publish/video/init/', [
                'post_info' => [
                    'title' => $content,
                    'privacy_level' => $privacyLevel,
                    'disable_duet' => false,
                    'disable_comment' => false,
                    'disable_stitch' => false,
                ],
                'source_info' => [
                    'source' => 'FILE_UPLOAD',
                    'video_size' => $size,
                    'chunk_size' => $size,
                    'total_chunk_count' => 1,
                ],
            ]);

            if (! $initResponse->successful()) {
                return PublishResult::fail($initResponse->json('error.message') ?? 'TikTok rejected this post.');
            }

            $publishId = $initResponse->json('data.publish_id');
            $uploadUrl = $initResponse->json('data.upload_url');

            if (! $publishId || ! $uploadUrl) {
                return PublishResult::fail('TikTok did not return an upload target.');
            }

            $absolutePath = Storage::disk('public')->path($item['path']);

            // No Authorization header here on purpose — the upload_url TikTok
            // just returned is itself a signed, single-use target; it
            // doesn't take (and can reject) a bearer token.
            $uploadResponse = Http::withHeaders([
                'Content-Type' => 'video/mp4',
                'Content-Range' => 'bytes 0-'.($size - 1)."/{$size}",
            ])->withBody(file_get_contents($absolutePath), 'video/mp4')->put($uploadUrl);

            if (! $uploadResponse->successful()) {
                return PublishResult::fail('Could not upload the video to TikTok.');
            }

            return $this->pollStatus($accessToken, $publishId);
        } catch (\Throwable $e) {
            return PublishResult::fail($e->getMessage());
        }
    }

    /**
     * TikTok requires calling this before every publish — it reflects the
     * creator's own account settings (some accounts have duet/stitch
     * disabled account-wide, or can't post publicly at all), and while this
     * app is unaudited, TikTok additionally restricts it to SELF_ONLY
     * (private, visible only to the creator) regardless of what the
     * account would otherwise allow — that's expected until the app passes
     * TikTok's review for public posting.
     */
    protected function queryPrivacyLevel(string $accessToken): string
    {
        $response = Http::withToken($accessToken)->post(self::API.'/post/publish/creator_info/query/', []);

        $options = $response->successful() ? ($response->json('data.privacy_level_options') ?? []) : [];

        if (in_array('SELF_ONLY', $options, true)) {
            return 'SELF_ONLY';
        }

        return $options[0] ?? 'SELF_ONLY';
    }

    protected function pollStatus(string $accessToken, string $publishId): PublishResult
    {
        for ($i = 0; $i < self::STATUS_POLL_ATTEMPTS; $i++) {
            sleep(self::STATUS_POLL_DELAY_SECONDS);

            $response = Http::withToken($accessToken)->post(self::API.'/post/publish/status/fetch/', [
                'publish_id' => $publishId,
            ]);

            $status = $response->json('data.status');

            if ($status === 'PUBLISH_COMPLETE') {
                return PublishResult::ok(platformPostId: $publishId);
            }

            if ($status === 'FAILED') {
                return PublishResult::fail($response->json('data.fail_reason') ?? 'TikTok failed to process this video.');
            }
        }

        // Still processing after our poll window — not a failure, TikTok is
        // just handling it asynchronously in the background. It'll finish
        // showing up on the creator's TikTok profile/inbox on its own.
        return PublishResult::ok(platformPostId: $publishId);
    }

    /**
     * TikTok access tokens last roughly 24 hours; refresh tokens last a
     * year. Rather than a separate scheduled job, this refreshes lazily
     * right before each publish attempt whenever the stored token looks
     * expired (or is about to).
     */
    protected function ensureFreshToken(SocialAccount $account): string
    {
        $expiresAt = $account->meta['expires_at'] ?? null;

        if ($expiresAt && now()->lt(Carbon::parse($expiresAt)->subMinutes(5))) {
            return $account->access_token;
        }

        $refreshToken = $account->meta['refresh_token'] ?? null;

        if (! $refreshToken) {
            // No refresh token on record — try the token we have and let
            // TikTok's own API reject it if it's actually expired.
            return $account->access_token;
        }

        $credential = PlatformCredential::where('platform', 'tiktok')->where('is_enabled', true)->first();

        if (! $credential) {
            return $account->access_token;
        }

        $response = Http::asForm()->post(self::API.'/oauth/token/', [
            'client_key' => $credential->client_id,
            'client_secret' => $credential->client_secret,
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
        ]);

        $newAccessToken = $response->successful() ? $response->json('access_token') : null;

        if (! $newAccessToken) {
            return $account->access_token;
        }

        $newRefreshToken = $response->json('refresh_token') ?? $refreshToken;
        $expiresIn = $response->json('expires_in');

        $account->update([
            'access_token' => $newAccessToken,
            'meta' => array_merge($account->meta ?? [], [
                'refresh_token' => $newRefreshToken,
                'expires_at' => $expiresIn ? now()->addSeconds($expiresIn)->toIso8601String() : null,
            ]),
        ]);

        return $newAccessToken;
    }
}
