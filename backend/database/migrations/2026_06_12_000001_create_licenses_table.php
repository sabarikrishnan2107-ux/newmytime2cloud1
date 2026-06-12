<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Generated desktop licenses (master-app side). Each row is one signed
     * license issued for a specific company + machine fingerprint. The desktop
     * never reads this table — it only verifies the signed token offline.
     */
    public function up()
    {
        Schema::create('licenses', function (Blueprint $table) {
            $table->id();
            $table->string('license_id')->unique();      // human-friendly id, also embedded in the token
            $table->unsignedBigInteger('company_id')->nullable();
            $table->string('company_name')->nullable();
            $table->string('machine_fp');                // bound machine fingerprint
            $table->json('allowed_devices')->nullable(); // whitelisted device serial numbers
            $table->integer('max_devices')->default(0);
            $table->integer('max_employees')->default(0);
            $table->date('issued_at');
            $table->date('expiry');
            $table->string('status')->default('active'); // active | superseded
            $table->text('token');                       // the full signed key, for re-download
            $table->timestamps();

            $table->index('company_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('licenses');
    }
};
