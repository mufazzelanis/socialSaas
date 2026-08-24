<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformCredential;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\Connectors\ConnectorFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SocialOAuthController extends Controller
{
    protected const PLATFORM_LABELS = [
        'facebook' => 'Facebook',
        'linkedin' => 'LinkedIn',
    ];

    /**
     * Step 1: the frontend calls this (authenticated) to get the URL to
     * send the browser to. Returns JSON rather than redirecting directly,
     * since this is called via axios/fetch, not a full page navigation.
     */
    public function redirect(Request $request, string $platform)
    {
        if (! in_array($platform, ConnectorFactory::supportedPlatforms(), true)) {
            abort(404, "Unknown platform [{$platform}].");
        }

        if (! $request->user()->hasPlatformPermission($platform)) {
            abort(403, "You don't have permission to connect {$platform}. Ask a super admin to grant it.");
        }

        $credential = PlatformCredential::where('platform', $platform)->where('is_enabled', true)->first();

        if (! $credential || ! $credential->client_id || ! $credential->has_secret) {
            $label = self::PLATFORM_LABELS[$platform] ?? ucfirst($platform);
            // Kept plain/non-technical since a regular (non-admin) user can see this message.
            abort(422, "{$label} login isn't turned on for this app yet. Ask your admin to enable it.");
        }

        $state = Str::random(40);
        // Short-lived mapping from the random state back to who initiated
        // this — the callback below runs unauthenticated (it's a plain
        // browser redirect from the platform, no Sanctum token attached).
        Cache::put("oauth_state:{$platform}:{$state}", $request->user()->id, now()->addMinutes(10));

        $connector = ConnectorFactory::make($platform);
        $url = $connector->getAuthorizationUrl($credential, $this->redirectUri($platform), $state);

        return response()->json(['url' => $url]);
    }

    /**
     * Step 2: the platform redirects the browser here directly after the
     * user approves (or denies) access. No auth middleware — identifies
     * the user via the `state` value cached in step 1.
     */
    public function callback(Request $request, string $platform)
    {
        $frontend = rtrim(config('app.frontend_url'), '/').'/accounts';

        if ($request->filled('error')) {
            $message = $request->get('error_description', $request->get('error'));

            return redirect()->away("{$frontend}?oauth_error=".urlencode($message)."&platform={$platform}");
        }

        $state = $request->get('state');
        $code = $request->get('code');

        if (! $state || ! $code || ! in_array($platform, ConnectorFactory::supportedPlatforms(), true)) {
            return redirect()->away("{$frontend}?oauth_error=".urlencode('Invalid callback request.')."&platform={$platform}");
        }

        $userId = Cache::pull("oauth_state:{$platform}:{$state}");

        if (! $userId) {
            return redirect()->away("{$frontend}?oauth_error=".urlencode('This connection link expired or was already used — please try again.')."&platform={$platform}");
        }

        $user = User::find($userId);
        $credential = PlatformCredential::where('platform', $platform)->where('is_enabled', true)->first();

        if (! $user || ! $credential) {
            return redirect()->away("{$frontend}?oauth_error=".urlencode('Could not complete the connection.')."&platform={$platform}");
        }

        try {
            $connector = ConnectorFactory::make($platform);
            $accounts = $connector->handleCallback($credential, $code, $this->redirectUri($platform));
        } catch (\Throwable $e) {
            Log::error("OAuth callback failed for {$platform}", ['error' => $e->getMessage()]);

            return redirect()->away("{$frontend}?oauth_error=".urlencode($e->getMessage())."&platform={$platform}");
        }

        $saved = 0;

        foreach ($accounts as $account) {
            if (! $user->hasPlatformPermission($account->platform)) {
                continue;
            }

            $socialAccount = $user->socialAccounts()->updateOrCreate(
                ['platform' => $account->platform, 'account_id' => $account->accountId],
                [
                    'account_name' => $account->accountName,
                    'access_token' => $account->accessToken,
                    'status' => 'connected',
                    'meta' => $account->meta,
                ]
            );

            ActivityLogger::log($user, 'account_connected', "Connected {$account->platform} account [{$account->accountName}].", ['social_account_id' => $socialAccount->id]);
            $saved++;
        }

        return redirect()->away("{$frontend}?connected={$platform}&count={$saved}&found=".count($accounts));
    }

    protected function redirectUri(string $platform): string
    {
        return url("/api/social-accounts/oauth/{$platform}/callback");
    }
}
