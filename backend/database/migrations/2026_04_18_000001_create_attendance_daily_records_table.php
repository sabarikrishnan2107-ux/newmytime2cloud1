<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_daily_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->date('attendance_date');
            $table->string('status', 20);
            $table->timestamp('in_time')->nullable();
            $table->timestamp('out_time')->nullable();
            $table->string('in_source', 20)->nullable();
            $table->string('out_source', 20)->nullable();
            $table->string('in_camera_name', 255)->nullable();
            $table->string('out_camera_name', 255)->nullable();
            $table->time('shift_start')->nullable();
            $table->timestamp('shift_window_start')->nullable();
            $table->timestamp('shift_window_end')->nullable();
            $table->integer('total_logs')->default(0);
            $table->integer('deduplicated_logs')->default(0);
            $table->boolean('single_log')->default(false);
            $table->boolean('in_window_matched')->default(false);
            $table->text('remark')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();

            $table->index('attendance_date', 'idx_attendance_daily_records_date');
            $table->index(['employee_id', 'attendance_date'], 'idx_attendance_daily_records_employee_date');
            $table->unique(['employee_id', 'attendance_date'], 'uq_attendance_daily_records_employee_date');
        });

        // Postgres-specific array columns that Blueprint cannot express
        DB::statement("ALTER TABLE attendance_daily_records ADD COLUMN sources text[] NOT NULL DEFAULT ARRAY[]::text[]");
        DB::statement("ALTER TABLE attendance_daily_records ADD COLUMN camera_names text[] NOT NULL DEFAULT ARRAY[]::text[]");
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_daily_records');
    }
};
