<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitor_pre_registrations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('visitor_name');
            $table->string('company_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('id_type')->nullable();
            $table->string('id_number')->nullable();
            $table->unsignedBigInteger('host_employee_id')->nullable();
            $table->string('host_name')->nullable();
            $table->string('purpose')->nullable();
            $table->string('visitor_type')->default('Business'); // Business, Contractor, Delivery, Interview, VIP
            $table->date('expected_date');
            $table->string('expected_time')->nullable();
            $table->text('notes')->nullable();
            $table->string('qr_code')->nullable(); // unique QR identifier
            $table->string('status')->default('pending'); // pending, confirmed, checked-in, no-show, cancelled
            $table->unsignedBigInteger('visitor_id')->nullable(); // links to visitors table after check-in
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'expected_date']);
            $table->index(['company_id', 'status']);
            $table->index('qr_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_pre_registrations');
    }
};
