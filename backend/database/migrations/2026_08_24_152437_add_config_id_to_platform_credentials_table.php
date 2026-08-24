<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('platform_credentials', function (Blueprint $table) {
            // "Facebook Login for Business" (what Business-type Meta apps
            // get instead of classic Facebook Login) authorizes via a
            // Configuration ID created in the app's Login for Business ->
            // Configurations screen, rather than a raw OAuth `scope` list.
            $table->string('config_id')->nullable()->after('client_secret');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('platform_credentials', function (Blueprint $table) {
            $table->dropColumn('config_id');
        });
    }
};
