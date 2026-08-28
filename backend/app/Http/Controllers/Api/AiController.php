<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    protected const DEFAULT_MODEL = 'claude-sonnet-5';

    protected const SYSTEM_PROMPT = <<<'PROMPT'
        You write social media post captions for a business owner. Given their
        request, write ONE ready-to-publish caption. Rules:
        - Output ONLY the caption text itself — no preamble, no explanation,
          no markdown formatting, no surrounding quotes.
        - Use plain text with natural line breaks (blank lines between
          paragraphs) — the caption will be posted as-is to Facebook,
          Instagram, LinkedIn, Telegram, and/or TikTok.
        - Do not invent specific facts (prices, dates, addresses) the user
          didn't give you — write around anything unspecified instead of
          making it up.
        - Only include hashtags if the user's request asks for them.
        PROMPT;

    public function generate(Request $request)
    {
        $data = $request->validate([
            'prompt' => ['required', 'string', 'max:2000'],
        ]);

        $setting = AiSetting::current();
        $apiKey = $setting->getDecryptedApiKey();

        if (! $setting->is_enabled || ! $apiKey) {
            return response()->json([
                'message' => "AI writing isn't set up yet — ask your admin to add an API key in Platform Credentials.",
            ], 422);
        }

        $response = Http::timeout(30)
            ->withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
            ])
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => $setting->model ?: self::DEFAULT_MODEL,
                'max_tokens' => 1024,
                'system' => self::SYSTEM_PROMPT,
                'messages' => [
                    ['role' => 'user', 'content' => $data['prompt']],
                ],
            ]);

        if (! $response->successful()) {
            return response()->json([
                'message' => $response->json('error.message') ?? 'AI generation failed — try again.',
            ], 422);
        }

        $text = collect($response->json('content'))
            ->firstWhere('type', 'text')['text'] ?? null;

        if (! $text) {
            return response()->json(['message' => 'AI did not return any text.'], 422);
        }

        return response()->json(['content' => trim($text)]);
    }
}
