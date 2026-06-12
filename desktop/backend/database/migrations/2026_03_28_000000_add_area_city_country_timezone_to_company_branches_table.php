<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_branches', function (Blueprint $table) {
            $table->string('area')->nullable()->after('address');
            $table->string('city')->nullable()->after('area');
            $table->string('country')->nullable()->after('city');
            $table->string('timezone')->nullable()->after('country');
        });
    }

    public function down(): void
    {
        Schema::table('company_branches', function (Blueprint $table) {
            $table->dropColumn(['area', 'city', 'country', 'timezone']);
        });
    }
};
