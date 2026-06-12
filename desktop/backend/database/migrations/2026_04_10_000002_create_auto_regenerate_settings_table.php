<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auto_regenerate_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable(); // null = all branches
            $table->enum('frequency', ['daily', 'weekly', 'monthly']);
            $table->string('run_time', 5)->default('02:00'); // HH:MM format
            $table->integer('day_of_week')->nullable(); // 0=Sun..6=Sat (for weekly)
            $table->integer('day_of_month')->nullable(); // 1-28 (for monthly)
            $table->integer('lookback_days')->default(7); // how many days back to regenerate (max 31)
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->string('last_run_status')->nullable(); // success, failed, running
            $table->text('last_run_message')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'is_active']);
            $table->index('branch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auto_regenerate_settings');
    }
};
