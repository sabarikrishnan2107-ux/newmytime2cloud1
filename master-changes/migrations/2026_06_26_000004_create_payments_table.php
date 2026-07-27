<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('ref')->unique();
            $table->unsignedBigInteger('invoice_id')->nullable()->index();
            $table->string('invoice_number')->nullable();
            $table->string('subscriber')->nullable();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('method')->default('Bank Transfer');
            $table->string('reference')->nullable();
            $table->string('status')->default('Confirmed');
            $table->date('date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
