<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        // Checks every minute for scheduled posts whose time has come.
        // This only fires at all if something is actually running
        // `php artisan schedule:run` once a minute — a real system cron
        // entry on the server, not something this app starts on its own.
        $schedule->command('posts:publish-due')->everyMinute()->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        // The local Apache vhost (socialsaas.test) terminates TLS then
        // proxies to `php artisan serve` over plain HTTP on the same
        // machine — without this, url()/isSecure() can't tell the original
        // request was HTTPS, so generated URLs (e.g. the Facebook OAuth
        // redirect_uri) would wrongly come out as http://.
        $middleware->trustProxies(at: ['127.0.0.1']);

        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // Applies the 'api' RateLimiter (defined in AppServiceProvider) to
        // every /api route by default.
        $middleware->throttleApi();

        // This is an API-only backend — never redirect unauthenticated
        // requests to a "login" web route (which doesn't exist here).
        $middleware->redirectGuestsTo(fn () => null);

        $middleware->alias([
            'super_admin' => \App\Http\Middleware\EnsureSuperAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
