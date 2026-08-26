<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ad_slots', function (Blueprint $table) {
            // Some ad formats never render a visible inline element by
            // design (Adsterra Social Bar / Popunder / Direct Link — they
            // attach to the whole page or open on click instead). Marking a
            // slot as one of those tells the frontend not to auto-hide it
            // just because nothing showed up inside its container.
            $table->boolean('no_visible_output')->default(false)->after('code');
        });
    }

    public function down(): void
    {
        Schema::table('ad_slots', function (Blueprint $table) {
            $table->dropColumn('no_visible_output');
        });
    }
};
