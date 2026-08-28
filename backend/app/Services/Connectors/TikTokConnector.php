<?php

namespace App\Services\Connectors;

use App\Models\PlatformCredential;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * TikTok's OAuth v2 mandates PKCE (code_verifier / code_challenge) — unlike
 * Facebook/LinkedIn above. That means a secret (the verifier) has to be
 * generated when building the authorization URL and recovered again on the
 * callback, with nothing but the `state` round-trip to tie the two
 * together, so it's cached under a key derived from `state` alongside the
 * user-id mapping the controller already keeps there.
 */
class TikTokConnector implements SocialConnectorInterface
{
    protected const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';

    protected const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

    protected const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

    public function getAuthorizationUrl(PlatformCredential $credential, string $redirectUri, string $state): string
    {
        $verifier = Str::random(64);
        Cache::put("oauth_pkce:tiktok:{$state}", $verifier, now()->addMinutes(10));

        $params = [
            'client_key' => $credential->client_id,
            'response_type' => 'code',
            // video.upload (draft) is included alongside video.publish
            // (direct post) so this still works while the app is unaudited
            // and TikTok has only granted the draft scope.
            'scope' => 'user.info.basic,video.publish,video.upload',
            'redirect_uri' => $redirectUri,
            'state' => $state,
            'code_challenge' => $this->challenge($verifier),
            'code_challenge_method' => 'S256',
        ];

        return self::AUTH_URL.'?'.http_build_query($params);
    }

    public function handleCallback(PlatformCredential $credential, string $code, string $redirectUri, string $state): array
    {
        $verifier = Cache::pull("oauth_pkce:tiktok:{$state}");

        if (! $verifier) {
            throw new RuntimeException('This TikTok connection link expired or was already used — please try again.');
        }

        $tokenResponse = Http::asForm()->post(self::TOKEN_URL, [
            'client_key' => $credential->client_id,
            'client_secret' => $credential->client_secret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirectUri,
            'code_verifier' => $verifier,
        ]);

        // TikTok's token endpoint returns 200 with an `error` field on
        // failure rather than a non-2xx status, so both must be checked.
        if (! $tokenResponse->successful() || $tokenResponse->json('error')) {
            throw new RuntimeException($tokenResponse->json('error_description') ?? 'TikTok did not return an access token.');
        }

        $accessToken = $tokenResponse->json('access_token');
        $refreshToken = $tokenResponse->json('refresh_token');
        $expiresIn = $tokenResponse->json('expires_in'); // seconds, ~24h
        $openId = $tokenResponse->json('open_id');

        if (! $accessToken || ! $openId) {
            throw new RuntimeException('TikTok did not return an access token.');
        }

        $profileResponse = Http::withToken($accessToken)->get(self::USER_INFO_URL, [
            'fields' => 'open_id,display_name',
        ]);

        $displayName = $profileResponse->successful()
            ? ($profileResponse->json('data.user.display_name') ?? null)
            : null;

        return [
            new ConnectedAccount(
                platform: 'tiktok',
                accountId: $openId,
                accountName: $displayName ?: 'TikTok Account',
                accessToken: $accessToken,
                meta: [
                    'refresh_token' => $refreshToken,
                    'expires_at' => $expiresIn ? now()->addSeconds($expiresIn)->toIso8601String() : null,
                ],
            ),
        ];
    }

    protected function challenge(string $verifier): string
    {
        return rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
    }
}
