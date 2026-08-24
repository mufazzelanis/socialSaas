<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stores THIS SaaS's own OAuth app credentials per platform
        // (e.g. the Facebook Developer App ID/Secret used to let users
        // connect their accounts via OAuth). Never used to store any
        // individual user's third-party account password.
        Schema::create('platform_credentials', function (Blueprint $table) {
            $table->id();
            $table->string('platform')->unique(); // facebook, instagram, linkedin
            $table->string('client_id')->nullable();
            $table->text('client_secret')->nullable(); // encrypted
            $table->boolean('is_enabled')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_credentials');
    }
};
