<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('active_license', function (Blueprint $table) {
            $table->integer('max_branches')->default(0)->after('max_devices');
            $table->string('company_name')->nullable()->after('company_id');
        });
    }

    public function down()
    {
        Schema::table('active_license', function (Blueprint $table) {
            $table->dropColumn(['max_branches', 'company_name']);
        });
    }
};
