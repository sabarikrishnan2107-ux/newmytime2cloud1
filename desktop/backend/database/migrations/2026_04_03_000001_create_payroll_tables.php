<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Salary structures per employee
        Schema::create('salary_structures', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('employee_id');
            $table->string('salary_mode')->default('gross_based'); // gross_based, basic_based, net_based
            $table->decimal('basic_salary', 12, 2)->default(0);
            $table->decimal('house_allowance', 12, 2)->default(0);
            $table->decimal('transport_allowance', 12, 2)->default(0);
            $table->decimal('food_allowance', 12, 2)->default(0);
            $table->decimal('medical_allowance', 12, 2)->default(0);
            $table->decimal('other_allowance', 12, 2)->default(0);
            $table->decimal('gross_salary', 12, 2)->default(0);
            $table->boolean('overtime_eligible')->default(false);
            $table->boolean('loan_deduction')->default(false);
            $table->boolean('advance_deduction')->default(false);
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->string('status')->default('active'); // active, inactive
            $table->timestamps();

            $table->index(['company_id', 'employee_id']);
        });

        // Payroll adjustments (bonus, incentive, fines, etc.)
        Schema::create('payroll_adjustments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('employee_id');
            $table->string('type'); // bonus, incentive, arrears, fine, reimbursement, other_addition, other_deduction
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('payroll_month'); // e.g. "2026-04"
            $table->text('remarks')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'employee_id', 'payroll_month']);
        });

        // Employee loans
        Schema::create('employee_loans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('employee_id');
            $table->decimal('loan_amount', 12, 2)->default(0);
            $table->decimal('monthly_installment', 12, 2)->default(0);
            $table->decimal('outstanding_balance', 12, 2)->default(0);
            $table->string('start_month')->nullable();
            $table->string('end_month')->nullable();
            $table->text('remarks')->nullable();
            $table->string('status')->default('active'); // active, completed, cancelled
            $table->timestamps();

            $table->index(['company_id', 'employee_id']);
        });

        // Employee advances
        Schema::create('employee_advances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('employee_id');
            $table->decimal('advance_amount', 12, 2)->default(0);
            $table->decimal('monthly_recovery', 12, 2)->default(0);
            $table->decimal('outstanding_balance', 12, 2)->default(0);
            $table->date('issue_date')->nullable();
            $table->text('remarks')->nullable();
            $table->string('status')->default('active'); // active, completed
            $table->timestamps();

            $table->index(['company_id', 'employee_id']);
        });

        // Payroll batches (monthly processing)
        Schema::create('payroll_batches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('month'); // e.g. "2026-04"
            $table->integer('total_employees')->default(0);
            $table->decimal('total_gross', 14, 2)->default(0);
            $table->decimal('total_deductions', 14, 2)->default(0);
            $table->decimal('total_net', 14, 2)->default(0);
            $table->string('status')->default('draft'); // draft, pending, approved, paid
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'month']);
        });

        // Payroll records (per employee per batch)
        Schema::create('payroll_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('batch_id');
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('employee_id');
            $table->string('month');
            // Attendance
            $table->integer('present_days')->default(0);
            $table->integer('absent_days')->default(0);
            $table->integer('late_days')->default(0);
            $table->decimal('ot_hours', 8, 2)->default(0);
            // Earnings
            $table->decimal('basic_salary', 12, 2)->default(0);
            $table->decimal('house_allowance', 12, 2)->default(0);
            $table->decimal('transport_allowance', 12, 2)->default(0);
            $table->decimal('food_allowance', 12, 2)->default(0);
            $table->decimal('medical_allowance', 12, 2)->default(0);
            $table->decimal('other_allowance', 12, 2)->default(0);
            $table->decimal('total_allowances', 12, 2)->default(0);
            $table->decimal('ot_amount', 12, 2)->default(0);
            $table->decimal('bonus', 12, 2)->default(0);
            $table->decimal('incentive', 12, 2)->default(0);
            $table->decimal('arrears', 12, 2)->default(0);
            $table->decimal('reimbursement', 12, 2)->default(0);
            $table->decimal('gross_earned', 12, 2)->default(0);
            // Deductions
            $table->decimal('absence_deduction', 12, 2)->default(0);
            $table->decimal('late_deduction', 12, 2)->default(0);
            $table->decimal('loan_deduction', 12, 2)->default(0);
            $table->decimal('advance_deduction', 12, 2)->default(0);
            $table->decimal('fine_amount', 12, 2)->default(0);
            $table->decimal('other_deduction', 12, 2)->default(0);
            $table->decimal('total_deduction', 12, 2)->default(0);
            // Net
            $table->decimal('net_salary', 12, 2)->default(0);
            $table->string('status')->default('draft'); // draft, approved, paid
            $table->timestamps();

            $table->index(['batch_id', 'employee_id']);
            $table->index(['company_id', 'month']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('payroll_records');
        Schema::dropIfExists('payroll_batches');
        Schema::dropIfExists('employee_advances');
        Schema::dropIfExists('employee_loans');
        Schema::dropIfExists('payroll_adjustments');
        Schema::dropIfExists('salary_structures');
    }
};
