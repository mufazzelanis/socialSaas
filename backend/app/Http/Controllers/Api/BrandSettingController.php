<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrandSetting;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BrandSettingController extends Controller
{
    public function show(Request $request)
    {
        return response()->json(BrandSetting::current());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'brand_name' => ['nullable', 'string', 'max:255'],
            'primary_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'logo' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp,svg', 'max:2048'],
            'favicon' => ['nullable', 'file', 'mimes:png,jpg,jpeg,ico,svg', 'max:512'],
            'remove_logo' => ['sometimes', 'boolean'],
            'remove_favicon' => ['sometimes', 'boolean'],
        ]);

        $setting = BrandSetting::current();

        if ($request->boolean('remove_logo') && $setting->logo_path) {
            Storage::disk('public')->delete($setting->logo_path);
            $setting->logo_path = null;
        }

        if ($request->boolean('remove_favicon') && $setting->favicon_path) {
            Storage::disk('public')->delete($setting->favicon_path);
            $setting->favicon_path = null;
        }

        if ($request->hasFile('logo')) {
            if ($setting->logo_path) {
                Storage::disk('public')->delete($setting->logo_path);
            }
            $setting->logo_path = $request->file('logo')->store('branding', 'public');
        }

        if ($request->hasFile('favicon')) {
            if ($setting->favicon_path) {
                Storage::disk('public')->delete($setting->favicon_path);
            }
            $setting->favicon_path = $request->file('favicon')->store('branding', 'public');
        }

        if (array_key_exists('brand_name', $data)) {
            $setting->brand_name = $data['brand_name'];
        }

        if (array_key_exists('primary_color', $data) && $data['primary_color']) {
            $setting->primary_color = $data['primary_color'];
        }

        $setting->updated_by = $request->user()->id;
        $setting->save();

        ActivityLogger::log($request->user(), 'branding_updated', 'Updated branding settings.');

        return response()->json($setting->fresh());
    }
}
