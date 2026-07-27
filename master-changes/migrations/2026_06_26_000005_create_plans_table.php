<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('tag')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->string('color')->default('neutral');
            $table->string('deployment')->default('Cloud');
            $table->jsonb('features')->nullable();
            $table->jsonb('limits')->nullable();
            $table->jsonb('feature_limits')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
