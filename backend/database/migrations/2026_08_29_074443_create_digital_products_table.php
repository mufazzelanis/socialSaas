<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_products', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('price'); // in poisha (BDT * 100) — avoids float rounding on money
            $table->string('image_path')->nullable(); // public disk — the storefront cover image
            // The actual deliverable — deliberately NOT on the public disk.
            // It's only ever served through OrderController::download() after
            // that specific order is confirmed paid; storing it publicly
            // would let anyone who guessed/found the path download it free.
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable(); // original filename, shown to the buyer on download
            $table->boolean('is_enabled')->default(true);
            $table->integer('sort_order')->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_products');
    }
};
