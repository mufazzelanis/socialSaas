<?php

namespace App\Services\Publishers;

use InvalidArgumentException;

class PublisherFactory
{
    /**
     * @var array<string, class-string<SocialPublisherInterface>>
     */
    protected static array $map = [
        'telegram' => TelegramPublisher::class,
        'facebook' => FacebookPublisher::class,
        'instagram' => InstagramPublisher::class,
        'linkedin' => LinkedInPublisher::class,
    ];

    public static function make(string $platform): SocialPublisherInterface
    {
        $class = static::$map[$platform] ?? null;

        if (! $class) {
            throw new InvalidArgumentException("No publisher registered for platform [{$platform}].");
        }

        return app($class);
    }

    public static function supportedPlatforms(): array
    {
        return array_keys(static::$map);
    }
}
