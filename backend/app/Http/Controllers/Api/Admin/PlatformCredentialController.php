<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformCredential;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PlatformCredentialController extends Controller
{
    protected array $platforms = ['telegram', 'facebook', 'instagram', 'linkedin', 'tiktok'];

    public function index(Request $request)
    {
        $existing = PlatformCredential::all()->keyBy('platform');

        $rows = collect($this->platforms)->map(function ($platform) use ($existing) {
            return $existing->get($platform) ?? new PlatformCredential([
                'platform' => $platform,
                'is_enabled' => false,
            ]);
        });

        return response()->json($rows->values());
    }

    public function update(Request $request, string $platform)
    {
        if (! in_array($platform, $this->platforms, true)) {
            abort(404, 'Unknown platform.');
        }

        $data = $request->validate([
            'client_id' => ['nullable', 'string', 'max:255'],
            'client_secret' => ['nullable', 'string', 'max:1000'],
            'config_id' => ['nullable', 'string', 'max:255'],
            'is_enabled' => ['sometimes', 'boolean'],
        ]);

        $credential = PlatformCredential::firstOrNew(['platform' => $platform]);

        // Saving compares the new value against the OLD one, which means
        // Eloquent has to decrypt the existing client_secret first. If it
        // was encrypted under an APP_KEY that's since changed (or is
        // otherwise corrupt), that decrypt throws and blocks saving a fresh
        // secret forever. Detect that up front and wipe just that column
        // directly (bypassing the model, so no decrypt is attempted) before
        // continuing — it was unusable anyway.
        if ($credential->exists) {
            try {
                $credential->client_secret;
            } catch (DecryptException) {
                DB::table('platform_credentials')->where('id', $credential->id)->update(['client_secret' => null]);
                $credential = PlatformCredential::find($credential->id);
            }
        }

        if (array_key_exists('client_id', $data)) {
            $credential->client_id = $data['client_id'];
        }

        if (array_key_exists('config_id', $data)) {
            $credential->config_id = $data['config_id'];
        }

        // Only overwrite the secret if a new one was actually submitted —
        // the frontend only ever sees a masked version, never the real value.
        if (! empty($data['client_secret'])) {
            $credential->client_secret = $data['client_secret'];
        }

        if (array_key_exists('is_enabled', $data)) {
            $credential->is_enabled = $data['is_enabled'];
        }

        $credential->updated_by = $request->user()->id;
        $credential->save();

        return response()->json($credential);
    }
}
