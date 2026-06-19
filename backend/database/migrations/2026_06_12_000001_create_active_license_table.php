<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stores the single license the desktop is currently activated with.
     *
     * IMPORTANT: this table is completely separate from employees / devices /
     * attendance_logs. Activating (or re-activating with an upgraded/renewed
     * key) only upserts the one row here — it never touches any business data.
     */
    public function up()
    {
        Schema::create('active_license', function (Blueprint $table) {
            $table->id();
            $table->string('license_id');
            $table->unsignedBigInteger('company_id')->nullable();
            $table->string('machine_fp');
            $table->json('allowed_devices')->nullable();
            $table->integer('max_devices')->default(0);
            $table->integer('max_employees')->default(0);
            $table->date('issued_at')->nullable();
            $table->date('expiry');
            $table->text('token');
            $table->timestamp('activated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('active_license');
    }
};
