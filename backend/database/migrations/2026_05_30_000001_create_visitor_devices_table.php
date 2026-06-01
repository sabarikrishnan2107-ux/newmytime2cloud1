<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('visitor_devices')) {
            Schema::create('visitor_devices', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('visitor_id')->index();
                $table->unsignedBigInteger('company_id')->index();
                $table->string('device_id');                 // device serial (Device.device_id)
                $table->unsignedBigInteger('device_pk')->nullable(); // Device.id
                $table->unsignedBigInteger('system_user_id'); // temp userCode pushed to the device
                $table->dateTime('valid_from')->nullable();
                $table->dateTime('valid_to')->nullable();     // expiry
                $table->dateTime('pushed_at')->nullable();
                $table->dateTime('removed_at')->nullable();
                $table->string('status')->default('pending'); // pending | pushed | expired | failed
                $table->timestamps();

                $table->index(['status', 'valid_to']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_devices');
    }
};
