<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('platform'); // telegram, facebook, instagram, linkedin
            $table->string('account_id')->nullable(); // e.g. telegram chat_id, FB page id
            $table->string('account_name')->nullable(); // display name
            $table->text('access_token')->nullable(); // encrypted
            $table->text('refresh_token')->nullable(); // encrypted
            $table->timestamp('token_expires_at')->nullable();
            $table->json('meta')->nullable(); // any extra platform-specific data
            $table->string('status')->default('connected'); // connected, expired, error
            $table->timestamps();

            $table->unique(['user_id', 'platform', 'account_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_accounts');
    }
};
