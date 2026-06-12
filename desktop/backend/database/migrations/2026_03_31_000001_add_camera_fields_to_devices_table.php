<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->string('camera_rtsp_ip')->nullable()->after('port');
            $table->integer('camera_rtsp_port')->nullable()->default(554)->after('camera_rtsp_ip');
            $table->string('camera_username')->nullable()->after('camera_rtsp_port');
            $table->string('camera_password')->nullable()->after('camera_username');
        });
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn(['camera_rtsp_ip', 'camera_rtsp_port', 'camera_username', 'camera_password']);
        });
    }
};
