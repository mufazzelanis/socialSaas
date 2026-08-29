<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            // A WhatsApp fallback for buying from the shop — useful on its
            // own before SSLCommerz is configured, and worth keeping
            // afterward too since some buyers just prefer messaging over
            // filling out a card form.
            $table->string('shop_whatsapp_number')->nullable()->after('facebook_pixel_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn('shop_whatsapp_number');
        });
    }
};
