<?php

use App\Http\Controllers\Api\Admin\ActivityLogController;
use App\Http\Controllers\Api\Admin\AdSlotController as AdminAdSlotController;
use App\Http\Controllers\Api\Admin\PlatformCredentialController;
use App\Http\Controllers\Api\Admin\ServiceController as AdminServiceController;
use App\Http\Controllers\Api\Admin\SiteSettingController as AdminSiteSettingController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AdSlotController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandSettingController;
use App\Http\Controllers\Api\InboxController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\SiteSettingController;
use App\Http\Controllers\Api\SocialAccountController;
use App\Http\Controllers\Api\SocialOAuthController;
use App\Http\Controllers\Api\Webhooks\MetaWebhookController;
use App\Http\Controllers\Api\Webhooks\TelegramWebhookController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Public: the platform redirects the browser straight here after the user
// approves/denies access — no Sanctum token is attached to that request.
Route::get('/social-accounts/oauth/{platform}/callback', [SocialOAuthController::class, 'callback']);

// Public: nothing here is sensitive (a Telegram channel link, a Meta Pixel
// ID — pixel IDs are sent in the client-side script itself either way).
// Needs to be reachable *before* login so the pixel loads and tracks
// PageView on the login/register pages too, not just once someone's
// already signed in.
Route::get('/site-settings', [SiteSettingController::class, 'show']);

// Public for the same reason — nothing sensitive (name/logo/favicon/color),
// and the login/register/forgot/reset pages need it to show the tenant's
// own branding before there's a session to authenticate with.
Route::get('/brand-settings', [BrandSettingController::class, 'show']);

// Public: called directly by each platform, not by our own frontend — each
// verifies the caller itself (a URL secret for Telegram, a signed payload
// for Meta) rather than relying on Sanctum, since the platforms don't have
// one of our tokens.
Route::post('/webhooks/telegram/{secret}', [TelegramWebhookController::class, 'handle']);
Route::get('/webhooks/meta', [MetaWebhookController::class, 'verify']);
Route::post('/webhooks/meta', [MetaWebhookController::class, 'handle']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/profile', [ProfileController::class, 'update']);

    Route::get('/social-accounts', [SocialAccountController::class, 'index']);
    Route::get('/social-accounts/telegram-bot-info', [SocialAccountController::class, 'telegramBotInfo']);
    Route::post('/social-accounts', [SocialAccountController::class, 'store']);
    Route::delete('/social-accounts/{socialAccount}', [SocialAccountController::class, 'destroy']);
    Route::get('/social-accounts/oauth/{platform}/redirect', [SocialOAuthController::class, 'redirect']);

    Route::get('/posts', [PostController::class, 'index']);
    Route::post('/posts', [PostController::class, 'store']);
    Route::get('/posts/{post}', [PostController::class, 'show']);
    Route::post('/posts/{post}', [PostController::class, 'update']);
    Route::post('/posts/{post}/publish', [PostController::class, 'publish']);
    Route::post('/posts/{post}/platforms/{postPlatform}/retry', [PostController::class, 'retryPlatform']);
    Route::delete('/posts/{post}', [PostController::class, 'destroy']);

    Route::get('/ad-slots', [AdSlotController::class, 'index']);
    Route::get('/services', [ServiceController::class, 'index']);

    Route::get('/conversations', [InboxController::class, 'index']);
    Route::get('/conversations/{conversation}', [InboxController::class, 'show']);
    Route::post('/conversations/{conversation}/reply', [InboxController::class, 'reply']);

    Route::middleware('super_admin')->prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::patch('/users/{user}', [AdminUserController::class, 'update']);

        Route::get('/activity-logs', [ActivityLogController::class, 'index']);

        Route::get('/platform-credentials', [PlatformCredentialController::class, 'index']);
        Route::post('/platform-credentials/{platform}', [PlatformCredentialController::class, 'update']);

        Route::get('/ad-slots', [AdminAdSlotController::class, 'index']);
        Route::post('/ad-slots/{placement}', [AdminAdSlotController::class, 'update']);

        Route::get('/services', [AdminServiceController::class, 'index']);
        Route::post('/services', [AdminServiceController::class, 'store']);
        Route::post('/services/{service}', [AdminServiceController::class, 'update']);
        Route::delete('/services/{service}', [AdminServiceController::class, 'destroy']);

        Route::post('/site-settings', [AdminSiteSettingController::class, 'update']);
    });

    // Branding is a super-admin-only customization (logo/favicon/color for
    // the dashboard) — regular users only get self-service profile editing
    // (see /profile above), not the ability to reskin the app.
    Route::middleware('super_admin')->post('/brand-settings', [BrandSettingController::class, 'update']);
});
