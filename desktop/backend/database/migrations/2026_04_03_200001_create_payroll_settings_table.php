<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_configs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id')->unique();
            // General
            $table->string('days_mode')->default('fixed_30'); // fixed_30, actual_calendar, working_days
            $table->decimal('working_hours_per_day', 4, 2)->default(8);
            $table->string('salary_mode')->default('gross_based');
            $table->string('currency')->default('AED');
            // Overtime
            $table->decimal('normal_ot_multiplier', 4, 2)->default(1.25);
            $table->decimal('weekend_ot_multiplier', 4, 2)->default(1.50);
            $table->decimal('holiday_ot_multiplier', 4, 2)->default(2.00);
            // Deductions
            $table->string('late_deduction_mode')->default('slab_based'); // per_minute, per_hour, slab_based
            $table->boolean('leave_deduction_enabled')->default(true);
            $table->string('rounding_rule')->default('none'); // none, round, floor, ceil
            $table->json('late_slabs')->nullable(); // JSON array of slab rules
            // Workflow
            $table->integer('approval_levels')->default(1);
            $table->boolean('lock_after_approval')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_configs');
    }
};
