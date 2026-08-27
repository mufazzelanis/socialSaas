<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('post_platforms', function (Blueprint $table) {
            // Null means "use the post's shared content" — only set when the
            // composer's per-platform customization was actually used for
            // this platform, so most rows stay null and just fall back.
            $table->text('content_override')->nullable()->after('platform');
        });
    }

    public function down(): void
    {
        Schema::table('post_platforms', function (Blueprint $table) {
            $table->dropColumn('content_override');
        });
    }
};
