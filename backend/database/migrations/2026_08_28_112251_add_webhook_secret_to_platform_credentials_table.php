<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_credentials', function (Blueprint $table) {
            // A random value only this app and the platform know, used to
            // authenticate inbound webhook calls (Telegram: appended to the
            // webhook URL path; Meta: the verify_token in its GET handshake
            // and/or the header signature check) — without it, anyone who
            // guesses the webhook URL could inject fake messages into a
            // user's inbox.
            $table->string('webhook_secret')->nullable()->after('config_id');
        });
    }

    public function down(): void
    {
        Schema::table('platform_credentials', function (Blueprint $table) {
            $table->dropColumn('webhook_secret');
        });
    }
};
