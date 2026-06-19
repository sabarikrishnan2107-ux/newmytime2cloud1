<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_event_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->timestamp('log_timestamp');
            $table->string('source', 20);
            $table->string('camera_name', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();

            $table->index(['employee_id', 'log_timestamp'], 'idx_attendance_event_logs_employee_timestamp');
            $table->index(['source', 'log_timestamp'], 'idx_attendance_event_logs_source_timestamp');
            $table->index('log_timestamp', 'idx_attendance_event_logs_timestamp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_event_logs');
    }
};
