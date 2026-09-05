<?php

namespace App\Services\Connectors;

use App\Models\PlatformCredential;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
            // Facebook Login for Business ignores `scope` entirely — the
            // permission list lives in the Configuration itself (Meta App
            // Dashboard -> Facebook Login for Business -> Configurations),
            // so pages_messaging/pages_manage_metadata/instagram_manage_messages
            // must be added there too, not just in the plain-scope branch below.
        } else {
            $params['scope'] = implode(',', [
                'pages_show_list',
                'pages_manage_posts',
                'pages_read_engagement',
                'instagram_basic',
                'instagram_content_publish',
                // Needed for the Inbox feature: pages_messaging to actually
                // send/receive Messenger messages, pages_manage_metadata to
                // subscribe a connected Page to our webhook (see
                // subscribeToWebhook() below) — without both, messages for
                // any Page other than the app's own admins/testers never
                // reach handleCallback()'s webhook at all.
                'pages_messaging',
                'pages_manage_metadata',
                'instagram_manage_messages',
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

            // Meta only ever fires the messages webhook for a Page once the
            // Page itself is subscribed to this app — that's a separate,
            // per-Page opt-in from granting the OAuth permission above.
            // Doing it here means a customer connecting their own Page just
            // works, instead of only the pages someone manually subscribed
            // via the App Dashboard (which in practice was only ever the
            // developer's own test Page). The same subscription also covers
            // Instagram DMs for whichever IG account is linked below, since
            // Instagram Messaging rides on the linked Page's subscription
            // rather than having one of its own.
            $this->subscribeToWebhook($page['id'], $page['access_token']);

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

    /**
     * Opts a connected Page into this app's webhook for the given fields.
     * Requires pages_manage_metadata (to make the call) and pages_messaging
     * (for `messages`/`messaging_postbacks` to actually carry data) on the
     * Page access token — deliberately non-fatal if either isn't granted
     * yet (e.g. Meta hasn't approved them for this user's account tier
     * yet, or the app is still in Development mode for non-tester users):
     * posting and everything else this connector does must keep working
     * even when messaging can't be wired up yet.
     */
    protected function subscribeToWebhook(string $pageId, string $pageAccessToken): void
    {
        $response = Http::post($this->graphUrl("{$pageId}/subscribed_apps"), [
            'access_token' => $pageAccessToken,
            'subscribed_fields' => 'messages,messaging_postbacks',
        ]);

        if (! $response->successful()) {
            Log::warning('Facebook: could not subscribe Page to webhook (messaging may not work for it).', [
                'page_id' => $pageId,
                'error' => $response->json('error.message') ?? $response->body(),
            ]);
        }
    }

    protected function assertOk($response, string $message): void
    {
        if (! $response->successful()) {
            $error = $response->json('error.message') ?? $message;

            throw new RuntimeException($error);
        }
    }
}
