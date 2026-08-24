<?php

namespace App\Services\Connectors;

/**
 * One account discovered/authorized during an OAuth callback, ready to be
 * upserted into social_accounts. A single OAuth flow can hand back more
 * than one of these (e.g. connecting Facebook also surfaces any Instagram
 * Business account linked to each Page).
 */
class ConnectedAccount
{
    public function __construct(
        public string $platform,
        public string $accountId,
        public string $accountName,
        public string $accessToken,
        public array $meta = [],
    ) {
    }
}
