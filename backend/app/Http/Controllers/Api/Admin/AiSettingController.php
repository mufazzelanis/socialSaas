<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AiSettingController extends Controller
{
    public function show()
    {
        return response()->json(AiSetting::current());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'provider' => ['sometimes', Rule::in(['claude', 'openai', 'gemini'])],
            'api_key' => ['nullable', 'string', 'max:500'],
            'model' => ['nullable', 'string', 'max:100'],
            'is_enabled' => ['sometimes', 'boolean'],
        ]);

        $setting = AiSetting::current();

        // Same decrypt-failure guard as PlatformCredentialController — an
        // APP_KEY rotation since this was saved would otherwise block
        // saving a fresh key forever.
        if ($setting->exists) {
            try {
                $setting->api_key;
            } catch (DecryptException) {
                DB::table('ai_settings')->where('id', $setting->id)->update(['api_key' => null]);
                $setting = AiSetting::find($setting->id);
            }
        }

        // A key saved for one provider is meaningless (and would just
        // fail) sent to a different one's API — switching providers
        // without supplying a fresh key clears the old one rather than
        // silently keeping an invalid key attached to the new provider.
        if (array_key_exists('provider', $data) && $data['provider'] !== $setting->provider) {
            $setting->api_key = null;
            $setting->model = null;
        }

        $setting->provider = $data['provider'] ?? $setting->provider;

        // Only overwrite the key if a new one was actually submitted — the
        // frontend never sees the real value, only whether one is set.
        if (! empty($data['api_key'])) {
            $setting->api_key = $data['api_key'];
        }

        if (array_key_exists('model', $data)) {
            $setting->model = $data['model'];
        }

        if (array_key_exists('is_enabled', $data)) {
            $setting->is_enabled = $data['is_enabled'];
        }

        $setting->updated_by = $request->user()->id;
        $setting->save();

        return response()->json($setting->fresh());
    }
}
