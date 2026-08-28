<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            // Which API this SaaS's post writer calls — 'claude' (Anthropic,
            // the default), 'openai' (ChatGPT), or 'gemini' (Google). The
            // api_key/model columns are reused across all three rather than
            // having a separate column set per provider, since a business
            // only ever configures one at a time.
            $table->string('provider')->default('claude')->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->dropColumn('provider');
        });
    }
};
