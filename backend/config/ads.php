<?php

return [
    // The fixed set of ad slots the dashboard UI knows how to render, and
    // the only placement keys AdSlotController will accept. Add a new key
    // here, then render <AdSlot placement="..." /> somewhere in the
    // frontend, to open up another spot for the super admin to fill with
    // an AdSense/Adsterra/custom embed code.
    'placements' => [
        'dashboard_top',
        'sidebar',
        'post_history',
        'create_post',
        'global_footer',
    ],

    // Labels only used to seed sensible defaults in AdSlotController::index
    // — purely informational, the network value doesn't change how a code
    // is rendered (it's always injected as-is).
    'networks' => ['adsense', 'adsterra', 'custom'],
];
