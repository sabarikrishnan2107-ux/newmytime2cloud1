<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('loan_deductions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('loan_id');
            $table->unsignedBigInteger('payroll_batch_id')->nullable();
            $table->unsignedBigInteger('payroll_record_id')->nullable();
            $table->string('payroll_month');
            $table->decimal('amount', 12, 2)->default(0);
            $table->decimal('balance_before', 12, 2)->default(0);
            $table->decimal('balance_after', 12, 2)->default(0);
            $table->timestamp('deducted_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'employee_id']);
            $table->index(['loan_id']);
            $table->index(['payroll_month']);
            $table->index(['payroll_batch_id']);
        });

        Schema::create('advance_deductions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('advance_id');
            $table->unsignedBigInteger('payroll_batch_id')->nullable();
            $table->unsignedBigInteger('payroll_record_id')->nullable();
            $table->string('payroll_month');
            $table->decimal('amount', 12, 2)->default(0);
            $table->decimal('balance_before', 12, 2)->default(0);
            $table->decimal('balance_after', 12, 2)->default(0);
            $table->timestamp('deducted_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'employee_id']);
            $table->index(['advance_id']);
            $table->index(['payroll_month']);
            $table->index(['payroll_batch_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('advance_deductions');
        Schema::dropIfExists('loan_deductions');
    }
};
