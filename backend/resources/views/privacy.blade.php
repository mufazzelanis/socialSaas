<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Privacy Policy — {{ config('app.name') }}</title>
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
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: {{ now()->format('F j, Y') }}</p>

    <p>{{ config('app.name') }} ("we", "our", "the App") is a social media scheduling and publishing
    tool. This page explains what data we collect, why, and how it's used — including data
    accessed through Facebook, Instagram, LinkedIn, and Telegram integrations.</p>

    <h2>What we collect</h2>
    <ul>
        <li><strong>Account information</strong>: name, email address, and phone number you provide when registering.</li>
        <li><strong>Connected platform data</strong>: when you connect a Facebook Page, Instagram Business
            account, LinkedIn profile, or Telegram channel, we store the account's public name/ID and an
            access token issued by that platform, so we can publish on your behalf. Access tokens are
            stored encrypted and are never shown in full anywhere in the app.</li>
        <li><strong>Content you create</strong>: the text and media (images/video) you write or upload to
            be published, and the resulting post IDs/URLs returned by each platform.</li>
        <li><strong>Usage/activity logs</strong>: actions like login, logout, and account connections, kept
            for security and troubleshooting.</li>
    </ul>

    <h2>How we use it</h2>
    <ul>
        <li>To authenticate you and keep your account secure.</li>
        <li>To publish the posts you create to the social accounts you've explicitly connected and selected —
            we never post anything you haven't written and submitted yourself.</li>
        <li>To show you your connected accounts, past posts, and their publish status.</li>
    </ul>

    <h2>What we don't do</h2>
    <ul>
        <li>We don't sell or rent your data to anyone.</li>
        <li>We don't share your data with third parties except the platform each access token belongs to
            (Meta/Facebook, LinkedIn, Telegram), and only to perform the publishing action you requested.</li>
        <li>We don't post, message, or take any action on your connected accounts other than what you
            initiate in the app.</li>
    </ul>

    <h2>Data retention &amp; deletion</h2>
    <p>Connected-account tokens and data are kept until you disconnect that account (Social Accounts page)
    or delete your {{ config('app.name') }} account. See our
    <a href="{{ url('/data-deletion') }}">Data Deletion Instructions</a> for how to remove your data.</p>

    <h2>Contact</h2>
    <p>Questions about this policy? Email
        <a href="mailto:mufazzelanis@gmail.com">mufazzelanis@gmail.com</a>.</p>
</body>
</html>
