<?php

return [
    // The canonical list of platforms the SaaS knows about. Used for
    // permission checks, the admin platform-credentials screen, etc.
    // Not every platform here necessarily has a working publisher yet —
    // see App\Services\Publishers\PublisherFactory for what's actually wired up.
    'platforms' => ['telegram', 'facebook', 'instagram', 'linkedin', 'tiktok'],

    // Whether a user who self-registers via the public /register form
    // automatically gets every platform permission, or starts locked out
    // until a super admin grants access individually. Toggle this in .env
    // (no code change needed) once you want tighter control — e.g. once
    // you're selling per-platform access as part of a paid plan.
    'grant_all_platforms_on_registration' => env('GRANT_ALL_PLATFORMS_ON_REGISTRATION', true),

    // Facebook Graph API version to call. Facebook deprecates old versions
    // over time — bump this if calls start failing with a version error.
    'facebook_graph_version' => env('FACEBOOK_GRAPH_VERSION', 'v21.0'),
];
