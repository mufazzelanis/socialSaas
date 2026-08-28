<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();

            // 'inbound' = the customer wrote this (arrived via webhook);
            // 'outbound' = one of our users replied (sent via that
            // platform's own Send API).
            $table->enum('direction', ['inbound', 'outbound']);
            $table->text('content')->nullable();
            $table->string('media_url')->nullable();

            // The platform's own id for this specific message, where it
            // gives one — used to avoid storing the same inbound webhook
            // delivery twice if the platform retries it.
            $table->string('external_message_id')->nullable();

            // Who sent an outbound reply, for the inbox UI ("replied by
            // ...") and activity logging. Null for inbound messages.
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('status')->default('received'); // received, sent, failed
            $table->text('error_message')->nullable();

            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
