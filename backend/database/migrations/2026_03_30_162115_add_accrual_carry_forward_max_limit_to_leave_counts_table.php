<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('leave_count', function (Blueprint $table) {
            $table->string('accrual')->default('monthly');
            $table->integer('carry_forward_max')->default(0);
            $table->integer('max_limit')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('leave_count', function (Blueprint $table) {
            $table->dropColumn(['accrual', 'carry_forward_max', 'max_limit']);
        });
    }
};
