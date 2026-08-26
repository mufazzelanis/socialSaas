<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            // Meta Pixel ID from Events Manager — a public identifier (it's
            // sent in the client-side pixel script itself), not a secret.
            $table->string('facebook_pixel_id')->nullable()->after('telegram_button_enabled');
            $table->boolean('facebook_pixel_enabled')->default(false)->after('facebook_pixel_id');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn(['facebook_pixel_id', 'facebook_pixel_enabled']);
        });
    }
};
