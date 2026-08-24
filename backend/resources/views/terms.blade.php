<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Terms of Service — {{ config('app.name') }}</title>
    <style>
        body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 760px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #1a1a2e; }
        h1 { margin-bottom: 4px; }
        .updated { color: #666; font-size: 0.9rem; margin-bottom: 32px; }
        h2 { margin-top: 32px; font-size: 1.2rem; }
        ul { padding-left: 20px; }
        a { color: #4338ca; }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p class="updated">Last updated: {{ now()->format('F j, Y') }}</p>

    <p>By creating an account or using {{ config('app.name') }} ("the App"), you agree to these terms.</p>

    <h2>What the App does</h2>
    <p>{{ config('app.name') }} lets you connect your own Facebook Pages, Instagram Business accounts,
    LinkedIn profile, and Telegram channels, then write and publish posts to them — either individually
    or to several at once — from a single place.</p>

    <h2>Your responsibilities</h2>
    <ul>
        <li>You must only connect accounts you own or are authorized to manage.</li>
        <li>Content you publish through the App must comply with the terms and community standards of
            each destination platform (Meta/Facebook, Instagram, LinkedIn, Telegram), and with applicable law.</li>
        <li>You're responsible for what you write and publish — the App only sends what you submit.</li>
        <li>Don't use the App to post spam, abusive content, or anything that violates a connected
            platform's policies; the platform (or we) may suspend access as a result.</li>
    </ul>

    <h2>Access &amp; account permissions</h2>
    <p>A super admin controls which platforms each user is allowed to connect. You can disconnect any
    connected account at any time from the Social Accounts page — this revokes the App's ability to post
    to it going forward.</p>

    <h2>Service availability</h2>
    <p>The App depends on third-party platform APIs (Meta, LinkedIn, Telegram) that we don't control.
    Publishing can fail if a platform changes its API, revokes a token, or is itself unavailable — we'll
    show the failure reason so you can retry or reconnect.</p>

    <h2>Termination</h2>
    <p>We may suspend or terminate access for accounts that violate these terms or misuse connected
    platforms. You may stop using the App and disconnect all accounts at any time.</p>

    <h2>Changes</h2>
    <p>We may update these terms as the App evolves; continued use after a change means you accept the
    updated terms.</p>

    <h2>Contact</h2>
    <p>Questions? Email <a href="mailto:mufazzelanis@gmail.com">mufazzelanis@gmail.com</a>.</p>
</body>
</html>
