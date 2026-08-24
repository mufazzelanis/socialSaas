<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Comma-separated list of origins the frontend is served from, e.g.
    // FRONTEND_URLS="https://app.example.com,https://example.com" in
    // production. Defaults to the local Vite dev server so local
    // development keeps working with no .env change needed.
    'allowed_origins' => array_filter(array_map(
        'trim',
        explode(',', env('FRONTEND_URLS', 'http://localhost:5173,http://127.0.0.1:5173'))
    )),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
