<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Holds the raw ad-network embed snippet (AdSense/Adsterra/any
        // custom script) per fixed placement slot in the dashboard UI.
        // Super admin manages these; every logged-in user's dashboard
        // renders whichever slots are enabled.
        Schema::create('ad_slots', function (Blueprint $table) {
            $table->id();
            $table->string('placement')->unique(); // dashboard_top, sidebar, post_history, create_post, global_footer
            $table->string('network')->default('custom'); // adsense, adsterra, custom
            $table->text('code')->nullable(); // raw <script>/<ins> embed snippet from the ad network
            $table->boolean('is_enabled')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_slots');
    }
};
