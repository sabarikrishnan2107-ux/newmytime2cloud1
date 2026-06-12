<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_government_holidays', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('company_id');
            $table->string('country_code', 2);
            $table->integer('year');
            $table->string('holiday_id'); // md5 hash from government holidays API
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('total_days')->default(1);
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['employee_id', 'holiday_id', 'year'], 'emp_gov_holiday_unique');
            $table->index(['employee_id', 'year']);
            $table->index('company_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_government_holidays');
    }
};
