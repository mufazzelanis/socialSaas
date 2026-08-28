<?php

namespace App\Services\Connectors;

use App\Models\PlatformCredential;

interface SocialConnectorInterface
{
    /**
     * Build the URL to send the browser to so the user can authorize us on
     * the platform's own site.
     */
    public function getAuthorizationUrl(PlatformCredential $credential, string $redirectUri, string $state): string;

    /**
     * Called on the OAuth callback with the authorization `code`. Exchanges
     * it for token(s) and returns every account this grants access to.
     *
     * `$state` is the same random value passed to getAuthorizationUrl() for
     * this attempt — most connectors don't need it back (the controller
     * already uses it to recover which user initiated the flow), but PKCE
     * flows (TikTok) need somewhere to stash the code_verifier between the
     * two calls, and this round-trip is the only thing tying them together.
     *
     * @return ConnectedAccount[]
     */
    public function handleCallback(PlatformCredential $credential, string $code, string $redirectUri, string $state): array;
}
