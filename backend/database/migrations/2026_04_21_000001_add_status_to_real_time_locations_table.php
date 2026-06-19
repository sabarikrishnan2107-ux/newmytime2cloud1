<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('real_time_locations', function (Blueprint $table) {
            if (!Schema::hasColumn('real_time_locations', 'status')) {
                // 'inside' | 'outside' — geofence state at the time the ping was sent.
                $table->string('status', 16)->nullable()->after('latitude');
            }
        });
    }

    public function down(): void
    {
        Schema::table('real_time_locations', function (Blueprint $table) {
            if (Schema::hasColumn('real_time_locations', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
