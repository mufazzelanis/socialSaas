<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;

class SiteSettingController extends Controller
{
    public function update(Request $request)
    {
        $data = $request->validate([
            'telegram_channel_url' => ['nullable', 'string', 'max:255'],
            'telegram_button_enabled' => ['sometimes', 'boolean'],
            // Meta Pixel IDs are 15-16 digit numbers.
            'facebook_pixel_id' => ['nullable', 'string', 'max:32', 'regex:/^\d+$/'],
            'facebook_pixel_enabled' => ['sometimes', 'boolean'],
        ]);

        $setting = SiteSetting::current();
        $setting->fill($data);
        $setting->updated_by = $request->user()->id;
        $setting->save();

        return response()->json($setting->fresh());
    }
}
