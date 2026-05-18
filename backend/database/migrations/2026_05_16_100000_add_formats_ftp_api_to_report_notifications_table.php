<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->json('formats')->nullable()->after('mediums');
            $table->json('ftp_config')->nullable()->after('formats');
            $table->json('api_config')->nullable()->after('ftp_config');
        });

        DB::table('report_notifications')
            ->whereNull('formats')
            ->update(['formats' => json_encode(['PDF'])]);
    }

    public function down(): void
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->dropColumn(['formats', 'ftp_config', 'api_config']);
        });
    }
};
