<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A singleton row (like site_settings/brand_settings) holding this
     * SaaS's own Anthropic API key for the "generate a post with AI"
     * composer feature — not any individual user's key, same reasoning as
     * platform_credentials for social platforms.
     */
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->id();
            $table->text('api_key')->nullable(); // encrypted
            $table->string('model')->nullable();
            $table->boolean('is_enabled')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
