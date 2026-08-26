<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Service cards the super admin advertises to every logged-in user
        // on the Dashboard — e.g. "we'll also design your logo" — each with
        // its own WhatsApp click-to-chat CTA to turn interest into a lead.
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('image_path')->nullable();
            $table->string('short_description')->nullable();
            $table->text('details')->nullable();
            $table->string('whatsapp_number')->nullable(); // international format, digits only when used
            $table->string('whatsapp_message')->nullable(); // pre-filled wa.me message; falls back to a default using the title
            $table->boolean('is_enabled')->default(true);
            $table->integer('sort_order')->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
