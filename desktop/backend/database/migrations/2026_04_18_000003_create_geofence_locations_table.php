<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('geofence_locations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('name', 255);
            $table->decimal('latitude', 10, 6);
            $table->decimal('longitude', 10, 6);
            $table->integer('radius')->default(200);
            $table->timestamps();

            $table->index('company_id', 'geofence_locations_company_id_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('geofence_locations');
    }
};
