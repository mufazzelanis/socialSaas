<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per "thread" with one other person on one connected account —
     * e.g. a specific Telegram user DMing your bot, or a specific customer
     * messaging your Facebook Page / Instagram account. A single
     * social_account can have many conversations (many different people
     * messaging the same Page), which is why this is its own table rather
     * than folding straight into social_accounts.
     */
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_account_id')->constrained()->cascadeOnDelete();

            // The platform's own id for whoever we're talking to — a
            // Telegram user id, a Messenger PSID, an Instagram-scoped id
            // (IGSID). Combined with social_account_id this uniquely
            // identifies "this customer talking to this one of our Pages".
            $table->string('participant_id');
            $table->string('participant_name')->nullable();
            $table->string('participant_avatar_url')->nullable();

            $table->timestamp('last_message_at')->nullable();
            $table->unsignedInteger('unread_count')->default(0);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['social_account_id', 'participant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
