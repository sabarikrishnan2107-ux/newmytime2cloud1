<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitor_blacklists', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->string('id_type')->nullable();
            $table->string('id_number')->nullable();
            $table->string('phone_number')->nullable();
            $table->string('email')->nullable();
            $table->text('reason');
            $table->string('added_by')->default('Admin');
            $table->integer('incidents')->default(1);
            $table->string('status')->default('active'); // active, removed
            $table->string('photo')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'id_number']);
            $table->index(['company_id', 'phone_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_blacklists');
    }
};
