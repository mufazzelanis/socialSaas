<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Jenssegers\Agent\Agent;

class ActivityLogger
{
    /**
     * Record an activity log entry for the current request.
     */
    public static function log(?User $user, string $event, ?string $description = null, array $meta = []): ActivityLog
    {
        $request = request();
        $ip = $request?->ip();
        $userAgentString = $request?->userAgent();

        $agent = new Agent();
        if ($userAgentString) {
            $agent->setUserAgent($userAgentString);
        }

        [$city, $country] = self::geolocate($ip);

        return ActivityLog::create([
            'user_id' => $user?->id,
            'event' => $event,
            'description' => $description,
            'ip_address' => $ip,
            'user_agent' => $userAgentString,
            'browser' => $agent->browser() ?: null,
            'platform' => $agent->platform() ?: null,
            'device_type' => $agent->isTablet() ? 'tablet' : ($agent->isMobile() ? 'mobile' : 'desktop'),
            'city' => $city,
            'country' => $country,
            'meta' => $meta ?: null,
            'created_at' => now(),
        ]);
    }

    /**
     * Best-effort IP geolocation. Fails silently and quickly — never blocks
     * the request for long, never throws. Skips private/loopback IPs (local dev).
     *
     * @return array{0: ?string, 1: ?string} [city, country]
     */
    protected static function geolocate(?string $ip): array
    {
        if (! $ip || ! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return [null, null];
        }

        try {
            $response = Http::timeout(1.5)->get("http://ip-api.com/json/{$ip}", [
                'fields' => 'status,country,city',
            ]);

            if ($response->ok() && $response->json('status') === 'success') {
                return [$response->json('city'), $response->json('country')];
            }
        } catch (\Throwable $e) {
            // Geolocation is a nice-to-have; never break the request for it.
        }

        return [null, null];
    }
}
