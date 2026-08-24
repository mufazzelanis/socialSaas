<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_platform_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('platform');
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->unique(['user_id', 'platform']);
        });

        // Backfill: grant every platform to every user that already exists,
        // so accounts created before this permission system shipped don't
        // suddenly lose access to platforms they were already using.
        // Users created from this point on start with NO platforms and must
        // be granted access by a super admin.
        $platforms = config('social.platforms');
        $now = now();

        $rows = [];
        foreach (DB::table('users')->pluck('id') as $userId) {
            foreach ($platforms as $platform) {
                $rows[] = [
                    'user_id' => $userId,
                    'platform' => $platform,
                    'created_at' => $now,
                ];
            }
        }

        if ($rows) {
            DB::table('user_platform_permissions')->insert($rows);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_platform_permissions');
    }
};
