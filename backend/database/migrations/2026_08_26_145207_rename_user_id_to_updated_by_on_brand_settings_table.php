<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Branding was originally modeled as one row per user; it's now a
     * single site-wide row (see BrandSetting::current()). `user_id` was
     * NOT NULL + cascadeOnDelete, which — now that it just means "who last
     * touched this" rather than "who owns this" — would delete the whole
     * row (logo/favicon included) if that admin's account were ever
     * deleted, and would reject the very first read on a fresh install
     * before any admin has saved anything. Renamed to `updated_by` and
     * relaxed to match every other admin-managed settings table
     * (ad_slots, services, site_settings).
     */
    public function up(): void
    {
        Schema::table('brand_settings', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropUnique(['user_id']);
            $table->renameColumn('user_id', 'updated_by');
        });

        Schema::table('brand_settings', function (Blueprint $table) {
            $table->unsignedBigInteger('updated_by')->nullable()->change();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('brand_settings', function (Blueprint $table) {
            $table->dropForeign(['updated_by']);
            $table->renameColumn('updated_by', 'user_id');
        });

        Schema::table('brand_settings', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique('user_id');
        });
    }
};
