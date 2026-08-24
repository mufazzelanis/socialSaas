<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            default => response()->json(['message' => ucfirst($platform)." connects via OAuth — use GET /social-accounts/oauth/{$platform}/redirect, not this endpoint."], 422),
        };
    }

    protected function connectTelegram(Request $request)
    {
        $data = $request->validate([
            'bot_token' => ['required', 'string'],
            'chat_id' => ['required', 'string'],
            'account_name' => ['nullable', 'string', 'max:255'],
        ]);

        // Verify the bot token + chat id actually work before saving.
        $response = Http::get("https://api.telegram.org/bot{$data['bot_token']}/getChat", [
            'chat_id' => $data['chat_id'],
        ]);

        $result = $response->json();

        if (! $response->successful() || empty($result['ok'])) {
            throw ValidationException::withMessages([
                'chat_id' => [$result['description'] ?? 'Could not verify this Telegram bot/chat. Make sure the bot is added to the chat/channel as admin.'],
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
                'access_token' => $data['bot_token'],
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

    public function destroy(Request $request, SocialAccount $socialAccount)
    {
        abort_unless($socialAccount->user_id === $request->user()->id, 403);

        ActivityLogger::log($request->user(), 'account_disconnected', "Disconnected {$socialAccount->platform} account [{$socialAccount->account_name}].", ['social_account_id' => $socialAccount->id]);

        $socialAccount->delete();

        return response()->json(['message' => 'Account disconnected.']);
    }
}
