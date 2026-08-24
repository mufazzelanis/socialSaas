<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Tight limit on login/register so the endpoints can't be brute-forced.
        // Keyed by IP + the email being attempted, so one attacker guessing
        // many emails from one IP is still throttled per-email, and a
        // shared office IP with many legitimate users isn't punished as a group.
        RateLimiter::for('auth', function ($request) {
            $email = (string) $request->input('email');

            return Limit::perMinute(6)->by($request->ip().'|'.$email);
        });

        // General ceiling for everything else under /api — generous enough
        // for normal dashboard use, tight enough to blunt scripted abuse.
        RateLimiter::for('api', function ($request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    }
}
