<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->unsignedBigInteger('company_id')->nullable()->index();
            $table->string('prospect');
            $table->string('customer_email')->nullable();
            $table->string('deployment')->default('Cloud');
            $table->string('plan')->default('Professional');
            $table->date('date');
            $table->date('valid_until')->nullable();
            $table->string('status')->default('Draft');
            $table->integer('modules')->default(0);
            $table->integer('users')->default(0);
            $table->integer('devices')->default(0);
            $table->integer('branches')->default(0);
            $table->decimal('amount', 14, 2)->default(0);
            $table->decimal('tax', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained()->cascadeOnDelete();
            $table->string('code')->nullable();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->decimal('qty', 12, 2)->default(1);
            $table->string('unit')->nullable();
            $table->decimal('rate', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');
    }
};
