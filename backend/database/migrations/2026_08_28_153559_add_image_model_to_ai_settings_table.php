<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            // Separate from `model` (the text-caption model) — OpenAI's
            // image models (gpt-image-1, dall-e-3) are a different family
            // from its chat models, so the two can't share one column.
            // Gemini doesn't need this set at all: its flash models
            // generate images natively from the same `model` column.
            $table->string('image_model')->nullable()->after('model');
        });
    }

    public function down(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->dropColumn('image_model');
        });
    }
};
