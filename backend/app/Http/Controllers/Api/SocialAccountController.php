<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformCredential;
use App\Models\SocialAccount;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class SocialAccountController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->socialAccounts()->latest()->get()
        );
    }

    /**
     * Public-ish info a normal user needs to connect Telegram themselves:
     * which bot (by @username) to add as admin to their channel. Never
     * exposes the bot token itself.
     */
    public function telegramBotInfo(Request $request)
    {
        $credential = PlatformCredential::where('platform', 'telegram')->first();

        return response()->json([
            'configured' => (bool) ($credential?->is_enabled && $credential?->has_secret),
            'bot_username' => $credential?->client_id,
        ]);
    }

    public function store(Request $request)
    {
        $platform = $request->string('platform')->toString();

        if (! in_array($platform, config('social.platforms'), true)) {
            return response()->json(['message' => "Unsupported platform [{$platform}]."], 422);
        }

        if (! $request->user()->hasPlatformPermission($platform)) {
            abort(403, "You don't have permission to connect a {$platform} account. Ask a super admin to grant it.");
        }

        return match ($platform) {
            'telegram' => $this->connectTelegram($request),
            'whatsapp' => $this->connectWhatsapp($request),
            default => response()->json(['message' => ucfirst($platform)." connects via OAuth — use GET /social-accounts/oauth/{$platform}/redirect, not this endpoint."], 422),
        };
    }

    protected function connectTelegram(Request $request)
    {
        $data = $request->validate([
            'chat_id' => ['required', 'string'],
            'account_name' => ['nullable', 'string', 'max:255'],
        ]);

        // The bot itself is the SaaS's own — configured once by a super
        // admin in Platform Credentials — not something each user brings.
        // Users only add that bot as admin to their channel and give us
        // the chat id.
        $credential = PlatformCredential::where('platform', 'telegram')->first();

        if (! $credential || ! $credential->is_enabled || ! $credential->has_secret) {
            throw ValidationException::withMessages([
                'chat_id' => ['Telegram isn\'t set up yet — ask your admin to configure the bot first.'],
            ]);
        }

        $botToken = $credential->client_secret;

        // Verify the bot is actually in that chat before saving.
        $response = Http::get("https://api.telegram.org/bot{$botToken}/getChat", [
            'chat_id' => $data['chat_id'],
        ]);

        $result = $response->json();

        if (! $response->successful() || empty($result['ok'])) {
            throw ValidationException::withMessages([
                'chat_id' => [$result['description'] ?? 'Could not verify this Telegram chat. Make sure the bot is added to the chat/channel as admin.'],
            ]);
        }

        $chat = $result['result'];
        $username = $chat['username'] ?? null;
        $title = $chat['title'] ?? $chat['first_name'] ?? $data['chat_id'];

        $account = $request->user()->socialAccounts()->updateOrCreate(
            [
                'platform' => 'telegram',
                'account_id' => $data['chat_id'],
            ],
            [
                'account_name' => $data['account_name'] ?? $title,
                'access_token' => $botToken,
                'status' => 'connected',
                'meta' => [
                    'username' => $username,
                    'title' => $title,
                ],
            ]
        );

        ActivityLogger::log($request->user(), 'account_connected', "Connected Telegram account [{$account->account_name}].", ['social_account_id' => $account->id]);

        return response()->json($account, 201);
    }

    /**
     * Unlike Telegram (a per-user chat id on a shared bot), WhatsApp here
     * is one shared business phone number — while in Meta's free test mode
     * there's only one to connect, so this just confirms it works and
     * attaches it, no per-user identifier to collect.
     */
    protected function connectWhatsapp(Request $request)
    {
        $credential = PlatformCredential::where('platform', 'whatsapp')->first();

        if (! $credential || ! $credential->is_enabled || ! $credential->has_secret || ! $credential->client_id) {
            throw ValidationException::withMessages([
                'platform' => ['WhatsApp isn\'t set up yet — ask your admin to configure it first.'],
            ]);
        }

        $phoneNumberId = $credential->client_id;
        $accessToken = $credential->client_secret;

        $response = Http::withToken($accessToken)->get(
            "https://graph.facebook.com/".config('social.facebook_graph_version')."/{$phoneNumberId}",
            ['fields' => 'verified_name,display_phone_number']
        );

        if (! $response->successful()) {
            throw ValidationException::withMessages([
                'platform' => [$response->json('error.message') ?? 'Could not verify this WhatsApp number.'],
            ]);
        }

        $data = $response->json();
        $displayName = $data['verified_name'] ?? $data['display_phone_number'] ?? 'WhatsApp Business';

        $account = $request->user()->socialAccounts()->updateOrCreate(
            ['platform' => 'whatsapp', 'account_id' => $phoneNumberId],
            [
                'account_name' => $displayName,
                'access_token' => $accessToken,
                'status' => 'connected',
                'meta' => ['display_phone_number' => $data['display_phone_number'] ?? null],
            ]
        );

        ActivityLogger::log($request->user(), 'account_connected', "Connected WhatsApp account [{$account->account_name}].", ['social_account_id' => $account->id]);

        return response()->json($account, 201);
    }

    public function destroy(Request $request, SocialAccount $socialAccount)
    {
        abort_unless($socialAccount->user_id === $request->user()->id, 403);

        ActivityLogger::log($request->user(), 'account_disconnected', "Disconnected {$socialAccount->platform} account [{$socialAccount->account_name}].", ['social_account_id' => $socialAccount->id]);

        $socialAccount->delete();

        return response()->json(['message' => 'Account disconnected.']);
    }
}
