<?php

namespace App\Services\Publishers;

class PublishResult
{
    public function __construct(
        public bool $success,
        public ?string $platformPostId = null,
        public ?string $postUrl = null,
        public ?string $errorMessage = null,
    ) {
    }

    public static function ok(?string $platformPostId = null, ?string $postUrl = null): self
    {
        return new self(true, $platformPostId, $postUrl);
    }

    public static function fail(string $errorMessage): self
    {
        return new self(false, errorMessage: $errorMessage);
    }
}
