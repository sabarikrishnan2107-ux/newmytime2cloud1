<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_notification_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('report_notification_logs', 'medium')) {
                $table->string('medium', 16)->default('Email')->after('notification_id');
                $table->index('medium');
            }
            if (!Schema::hasColumn('report_notification_logs', 'status')) {
                $table->string('status', 32)->nullable();
            }
            if (!Schema::hasColumn('report_notification_logs', 'attempt')) {
                $table->integer('attempt')->default(0);
            }
            if (!Schema::hasColumn('report_notification_logs', 'response_summary')) {
                $table->text('response_summary')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('report_notification_logs', function (Blueprint $table) {
            if (Schema::hasColumn('report_notification_logs', 'medium')) {
                $table->dropIndex(['medium']);
                $table->dropColumn('medium');
            }
            if (Schema::hasColumn('report_notification_logs', 'status')) {
                $table->dropColumn('status');
            }
            if (Schema::hasColumn('report_notification_logs', 'attempt')) {
                $table->dropColumn('attempt');
            }
            if (Schema::hasColumn('report_notification_logs', 'response_summary')) {
                $table->dropColumn('response_summary');
            }
        });
    }
};
