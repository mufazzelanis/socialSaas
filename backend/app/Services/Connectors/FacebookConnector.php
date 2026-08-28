<?php

namespace App\Services\Connectors;

use App\Models\PlatformCredential;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Handles both Facebook Pages AND Instagram — Instagram Business accounts
 * are only reachable through a linked Facebook Page's Graph API access, so
 * there's no separate "Instagram login"; connecting Facebook here also
 * surfaces any Instagram Business account attached to each Page.
 */
class FacebookConnector implements SocialConnectorInterface
{
    protected function version(): string
    {
        return config('social.facebook_graph_version');
    }

    protected function graphUrl(string $path): string
    {
        return "https://graph.facebook.com/{$this->version()}/{$path}";
    }

    public function getAuthorizationUrl(PlatformCredential $credential, string $redirectUri, string $state): string
    {
        $params = [
            'client_id' => $credential->client_id,
            'redirect_uri' => $redirectUri,
            'state' => $state,
            'response_type' => 'code',
        ];

        // Business-type Meta apps get "Facebook Login for Business" instead
        // of classic Facebook Login — it authorizes via a Configuration ID
        // (created in the app's Login for Business -> Configurations screen)
        // rather than a raw `scope` list. Without it, Facebook's own dialog
        // rejects the request as an unavailable feature. Consumer-type apps
        // still use plain `scope`, so support both.
        if ($credential->config_id) {
            $params['config_id'] = $credential->config_id;
        } else {
            $params['scope'] = implode(',', [
                'pages_show_list',
                'pages_manage_posts',
                'pages_read_engagement',
                'instagram_basic',
                'instagram_content_publish',
            ]);
        }

        return "https://www.facebook.com/{$this->version()}/dialog/oauth?".http_build_query($params);
    }

    public function handleCallback(PlatformCredential $credential, string $code, string $redirectUri, string $state): array
    {
        // 1. Exchange the code for a short-lived user access token.
        $tokenResponse = Http::get($this->graphUrl('oauth/access_token'), [
            'client_id' => $credential->client_id,
            'client_secret' => $credential->client_secret,
            'redirect_uri' => $redirectUri,
            'code' => $code,
        ]);

        $this->assertOk($tokenResponse, 'Facebook did not return an access token.');
        $shortLivedToken = $tokenResponse->json('access_token');

        // 2. Exchange it for a long-lived user access token (~60 days).
        $longLivedResponse = Http::get($this->graphUrl('oauth/access_token'), [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $credential->client_id,
            'client_secret' => $credential->client_secret,
            'fb_exchange_token' => $shortLivedToken,
        ]);

        $this->assertOk($longLivedResponse, 'Facebook did not return a long-lived access token.');
        $userToken = $longLivedResponse->json('access_token');

        // 3. List the Pages this user manages, with each Page's own token
        // (Page tokens derived from a long-lived user token don't expire).
        $pagesResponse = Http::get($this->graphUrl('me/accounts'), [
            'access_token' => $userToken,
            'fields' => 'id,name,access_token,instagram_business_account',
        ]);

        $this->assertOk($pagesResponse, 'Could not list your Facebook Pages.');
        $pages = $pagesResponse->json('data') ?? [];

        $accounts = [];

        foreach ($pages as $page) {
            $accounts[] = new ConnectedAccount(
                platform: 'facebook',
                accountId: $page['id'],
                accountName: $page['name'],
                accessToken: $page['access_token'],
                meta: [],
            );

            $igAccountId = $page['instagram_business_account']['id'] ?? null;

            if ($igAccountId) {
                $igResponse = Http::get($this->graphUrl($igAccountId), [
                    'access_token' => $page['access_token'],
                    'fields' => 'id,username,name',
                ]);

                if ($igResponse->successful()) {
                    $ig = $igResponse->json();

                    $accounts[] = new ConnectedAccount(
                        platform: 'instagram',
                        accountId: $ig['id'],
                        // Instagram Graph API is authenticated with the
                        // linked Facebook Page's access token, not its own.
                        accountName: '@'.($ig['username'] ?? $ig['name'] ?? $igAccountId),
                        accessToken: $page['access_token'],
                        meta: ['facebook_page_id' => $page['id']],
                    );
                }
            }
        }

        return $accounts;
    }

    protected function assertOk($response, string $message): void
    {
        if (! $response->successful()) {
            $error = $response->json('error.message') ?? $message;

            throw new RuntimeException($error);
        }
    }
}
