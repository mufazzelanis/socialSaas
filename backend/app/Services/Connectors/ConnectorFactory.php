<?php

namespace App\Services\Connectors;

use InvalidArgumentException;

class ConnectorFactory
{
    /**
     * Platforms with their own OAuth flow. Instagram is deliberately absent
     * — there's no standalone Instagram login for publishing; connecting
     * Facebook also discovers any linked Instagram Business account (see
     * FacebookConnector). "Connect Instagram" in the UI just triggers the
     * facebook flow.
     *
     * @var array<string, class-string<SocialConnectorInterface>>
     */
    protected static array $map = [
        'facebook' => FacebookConnector::class,
        'linkedin' => LinkedInConnector::class,
    ];

    public static function make(string $platform): SocialConnectorInterface
    {
        $class = static::$map[$platform] ?? null;

        if (! $class) {
            throw new InvalidArgumentException("No OAuth connector registered for platform [{$platform}].");
        }

        return app($class);
    }

    public static function supportedPlatforms(): array
    {
        return array_keys(static::$map);
    }
}
