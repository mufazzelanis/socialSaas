<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Data Deletion Instructions — {{ config('app.name') }}</title>
    <style>
        body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 760px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #1a1a2e; }
        h1 { margin-bottom: 4px; }
        .updated { color: #666; font-size: 0.9rem; margin-bottom: 32px; }
        h2 { margin-top: 32px; font-size: 1.2rem; }
        ol, ul { padding-left: 20px; }
        a { color: #4338ca; }
    </style>
</head>
<body>
    <h1>Data Deletion Instructions</h1>
    <p class="updated">Last updated: {{ now()->format('F j, Y') }}</p>

    <p>You're always in control of the data {{ config('app.name') }} holds for you. There are two levels
    of deletion:</p>

    <h2>1. Disconnect a single social account</h2>
    <p>Go to <strong>Social Accounts</strong> in the App and click <strong>Disconnect</strong> next to any
    connected Facebook Page, Instagram account, LinkedIn profile, or Telegram channel. This immediately
    deletes its stored access token and account data from our database — we can no longer post to it
    afterwards.</p>

    <h2>2. Delete your whole account</h2>
    <p>To delete your {{ config('app.name') }} account and everything tied to it (connected accounts,
    tokens, posts, activity history), email
    <a href="mailto:mufazzelanis@gmail.com">mufazzelanis@gmail.com</a> from the email address on your
    account, with the subject "Delete my account". We'll confirm and complete the deletion within a few
    business days.</p>

    <h2>Removing the app from Facebook/Instagram directly</h2>
    <p>You can also revoke access at any time from Facebook's own settings: <strong>Settings &amp;
    Privacy → Settings → Business Integrations</strong> (or <strong>Apps and Websites</strong>), find
    "{{ config('app.name') }}", and remove it. This immediately invalidates the access token(s) we hold
    for you, independent of anything above.</p>
</body>
</html>
