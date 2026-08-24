<?php

namespace App\Services\Connectors;

use App\Models\PlatformCredential;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class LinkedInConnector implements SocialConnectorInterface
{
    public function getAuthorizationUrl(PlatformCredential $credential, string $redirectUri, string $state): string
    {
        $params = [
            'response_type' => 'code',
            'client_id' => $credential->client_id,
            'redirect_uri' => $redirectUri,
            'state' => $state,
            // "Sign In with LinkedIn using OpenID Connect" + "Share on
            // LinkedIn" products both need to be added to the app in the
            // LinkedIn Developer Portal for these scopes to be grantable.
            'scope' => 'openid profile w_member_social',
        ];

        return 'https://www.linkedin.com/oauth/v2/authorization?'.http_build_query($params);
    }

    public function handleCallback(PlatformCredential $credential, string $code, string $redirectUri): array
    {
        $tokenResponse = Http::asForm()->post('https://www.linkedin.com/oauth/v2/accessToken', [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri,
            'client_id' => $credential->client_id,
            'client_secret' => $credential->client_secret,
        ]);

        if (! $tokenResponse->successful()) {
            throw new RuntimeException($tokenResponse->json('error_description') ?? 'LinkedIn did not return an access token.');
        }

        $accessToken = $tokenResponse->json('access_token');
        $expiresIn = $tokenResponse->json('expires_in'); // seconds, ~60 days

        $profileResponse = Http::withToken($accessToken)->get('https://api.linkedin.com/v2/userinfo');

        if (! $profileResponse->successful()) {
            throw new RuntimeException('Could not fetch your LinkedIn profile.');
        }

        $profile = $profileResponse->json();
        $memberId = $profile['sub'] ?? null;

        if (! $memberId) {
            throw new RuntimeException('LinkedIn did not return a member id.');
        }

        return [
            new ConnectedAccount(
                platform: 'linkedin',
                accountId: $memberId,
                accountName: $profile['name'] ?? 'LinkedIn Member',
                accessToken: $accessToken,
                meta: [
                    'urn' => "urn:li:person:{$memberId}",
                    'expires_at' => $expiresIn ? now()->addSeconds($expiresIn)->toIso8601String() : null,
                ],
            ),
        ];
    }
}
