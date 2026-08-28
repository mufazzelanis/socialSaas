<?php

namespace App\Services\Messaging;

class SendMessageResult
{
    public function __construct(
        public bool $success,
        public ?string $externalMessageId = null,
        public ?string $errorMessage = null,
    ) {
    }

    public static function ok(?string $externalMessageId = null): self
    {
        return new self(true, $externalMessageId);
    }

    public static function fail(string $errorMessage): self
    {
        return new self(false, errorMessage: $errorMessage);
    }
}
