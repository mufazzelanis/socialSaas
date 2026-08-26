<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Singleton row (always id=1) for site-wide, non-branding settings —
        // starting with the floating "Join our Telegram channel" button.
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('telegram_channel_url')->nullable();
            $table->boolean('telegram_button_enabled')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
