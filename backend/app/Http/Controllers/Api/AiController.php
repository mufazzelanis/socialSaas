<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    protected const DEFAULT_MODELS = [
        'claude' => 'claude-sonnet-5',
        'openai' => 'gpt-5',
        // Google retires Gemini model names fairly often — if this starts
        // erroring with "no longer available", the error message itself
        // names the current replacement; update here (or just set a Model
        // override in Admin Dashboard, no code change needed).
        'gemini' => 'gemini-3.6-flash',
    ];

    // Image generation only for providers that actually support it —
    // Claude has no image-generation capability at all. Both OpenAI and
    // Gemini need a DIFFERENT model family for images than for chat text
    // (confirmed directly against Gemini: passing responseModalities:
    // ["IMAGE"] to a plain chat model like gemini-3.6-flash returns
    // finishReason "NO_IMAGE" rather than an error — it just silently
    // can't do it — a dedicated "-image" model is required).
    protected const DEFAULT_IMAGE_MODELS = [
        'openai' => 'gpt-image-1',
        'gemini' => 'gemini-3.1-flash-image',
    ];

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

        $provider = $setting->provider ?: 'claude';
        $model = $setting->model ?: self::DEFAULT_MODELS[$provider];

        try {
            $text = match ($provider) {
                'openai' => $this->generateWithOpenAi($apiKey, $model, $data['prompt']),
                'gemini' => $this->generateWithGemini($apiKey, $model, $data['prompt']),
                default => $this->generateWithClaude($apiKey, $model, $data['prompt']),
            };
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! $text) {
            return response()->json(['message' => 'AI did not return any text.'], 422);
        }

        return response()->json(['content' => trim($text)]);
    }

    public function generateImage(Request $request)
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

        $provider = $setting->provider ?: 'claude';

        if ($provider === 'claude') {
            return response()->json([
                'message' => "Claude can't generate images — switch the provider to Gemini or ChatGPT in Platform Credentials to use this.",
            ], 422);
        }

        try {
            $image = match ($provider) {
                'openai' => $this->generateImageWithOpenAi(
                    $apiKey,
                    $setting->image_model ?: self::DEFAULT_IMAGE_MODELS['openai'],
                    $data['prompt']
                ),
                'gemini' => $this->generateImageWithGemini(
                    $apiKey,
                    $setting->image_model ?: self::DEFAULT_IMAGE_MODELS['gemini'],
                    $data['prompt']
                ),
            };
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! $image) {
            return response()->json(['message' => 'AI did not return an image.'], 422);
        }

        // A data: URL — the frontend turns this straight into a File object
        // and attaches it exactly like a manually-picked image, so nothing
        // about the post-creation flow needs to know an image came from AI
        // rather than the user's own device.
        return response()->json(['image' => $image]);
    }

    protected function generateWithClaude(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::timeout(30)
            ->withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
            ])
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'max_tokens' => 1024,
                'system' => self::SYSTEM_PROMPT,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException($response->json('error.message') ?? 'Claude request failed — try again.');
        }

        return collect($response->json('content'))->firstWhere('type', 'text')['text'] ?? null;
    }

    protected function generateWithOpenAi(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::timeout(30)
            ->withToken($apiKey)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException($response->json('error.message') ?? 'ChatGPT request failed — try again.');
        }

        return $response->json('choices.0.message.content');
    }

    protected function generateWithGemini(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::timeout(30)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                'system_instruction' => ['parts' => [['text' => self::SYSTEM_PROMPT]]],
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $prompt]]],
                ],
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException($response->json('error.message') ?? 'Gemini request failed — try again.');
        }

        return $response->json('candidates.0.content.parts.0.text');
    }

    protected function generateImageWithOpenAi(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::timeout(60)
            ->withToken($apiKey)
            ->post('https://api.openai.com/v1/images/generations', [
                'model' => $model,
                'prompt' => $prompt,
                'size' => '1024x1024',
                'n' => 1,
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException($response->json('error.message') ?? 'ChatGPT image generation failed — try again.');
        }

        $item = $response->json('data.0') ?? [];

        if (isset($item['b64_json'])) {
            return 'data:image/png;base64,'.$item['b64_json'];
        }

        // Some models return a fetchable URL instead of inline data —
        // fetch it ourselves so the frontend always gets one consistent
        // data: URL shape regardless of which the provider chose.
        if (isset($item['url'])) {
            $imageResponse = Http::timeout(30)->get($item['url']);

            if ($imageResponse->successful()) {
                $mime = $imageResponse->header('Content-Type') ?: 'image/png';

                return "data:{$mime};base64,".base64_encode($imageResponse->body());
            }
        }

        return null;
    }

    protected function generateImageWithGemini(string $apiKey, string $model, string $prompt): ?string
    {
        $response = Http::timeout(60)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'responseModalities' => ['IMAGE'],
                ],
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException($response->json('error.message') ?? 'Gemini image generation failed — try again.');
        }

        foreach ($response->json('candidates.0.content.parts') ?? [] as $part) {
            if (isset($part['inlineData']['data'])) {
                $mime = $part['inlineData']['mimeType'] ?? 'image/png';

                return "data:{$mime};base64,".$part['inlineData']['data'];
            }
        }

        return null;
    }
}
