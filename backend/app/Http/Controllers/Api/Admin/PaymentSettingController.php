<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentSettingController extends Controller
{
    public function show()
    {
        return response()->json(PaymentSetting::current());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'store_id' => ['nullable', 'string', 'max:255'],
            'store_password' => ['nullable', 'string', 'max:500'],
            'is_sandbox' => ['sometimes', 'boolean'],
            'is_enabled' => ['sometimes', 'boolean'],
        ]);

        $setting = PaymentSetting::current();

        // Same decrypt-failure guard as the other credential settings — an
        // APP_KEY rotation since this was saved would otherwise block
        // saving a fresh password forever.
        if ($setting->exists) {
            try {
                $setting->store_password;
            } catch (DecryptException) {
                DB::table('payment_settings')->where('id', $setting->id)->update(['store_password' => null]);
                $setting = PaymentSetting::find($setting->id);
            }
        }

        if (array_key_exists('store_id', $data)) {
            $setting->store_id = $data['store_id'];
        }

        if (! empty($data['store_password'])) {
            $setting->store_password = $data['store_password'];
        }

        if (array_key_exists('is_sandbox', $data)) {
            $setting->is_sandbox = $data['is_sandbox'];
        }

        if (array_key_exists('is_enabled', $data)) {
            $setting->is_enabled = $data['is_enabled'];
        }

        $setting->updated_by = $request->user()->id;
        $setting->save();

        return response()->json($setting->fresh());
    }
}
