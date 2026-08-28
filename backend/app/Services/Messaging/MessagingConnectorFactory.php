<?php

namespace App\Services\Messaging;

use InvalidArgumentException;

class MessagingConnectorFactory
{
    /**
     * @var array<string, class-string<MessagingConnectorInterface>>
     */
    protected static array $map = [
        'telegram' => TelegramMessagingConnector::class,
        'facebook' => MetaMessagingConnector::class,
        'instagram' => MetaMessagingConnector::class,
        'whatsapp' => WhatsAppMessagingConnector::class,
    ];

    public static function make(string $platform): MessagingConnectorInterface
    {
        $class = static::$map[$platform] ?? null;

        if (! $class) {
            throw new InvalidArgumentException("No messaging connector registered for platform [{$platform}].");
        }

        return app($class);
    }

    public static function supportedPlatforms(): array
    {
        return array_keys(static::$map);
    }
}
