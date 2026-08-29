<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('digital_product_id')->constrained()->cascadeOnDelete();

            // No buyer account/login involved — this is a public storefront,
            // so the buyer is identified only by what they typed at checkout.
            $table->string('buyer_name');
            $table->string('buyer_email');
            $table->string('buyer_phone')->nullable();

            $table->unsignedBigInteger('amount'); // poisha, snapshotted at purchase time (price can change later)
            $table->string('currency')->default('BDT');

            // SSLCommerz's own transaction id — the one thing that ties our
            // Order row to their side of the payment; must be unique since
            // it's how the IPN callback finds its way back to this order.
            $table->string('tran_id')->unique();
            $table->string('val_id')->nullable(); // SSLCommerz's validation id, set once payment is confirmed

            $table->string('status')->default('pending'); // pending, paid, failed, cancelled
            $table->json('gateway_response')->nullable(); // raw IPN/validation payload, kept for support/debugging

            // A random, unguessable link to the actual file — separate from
            // tran_id (which appears in browser redirect URLs / gateway
            // logs and shouldn't double as a download credential).
            $table->string('download_token')->unique()->nullable();
            $table->unsignedInteger('download_count')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
