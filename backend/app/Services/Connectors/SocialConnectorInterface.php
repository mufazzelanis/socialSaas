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
     * @return ConnectedAccount[]
     */
    public function handleCallback(PlatformCredential $credential, string $code, string $redirectUri): array;
}
