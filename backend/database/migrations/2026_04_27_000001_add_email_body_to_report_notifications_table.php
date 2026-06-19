<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasColumn('report_notifications', 'email_body')) {
            Schema::table('report_notifications', function (Blueprint $table) {
                $table->text('email_body')->nullable()->after('body');
            });
        }
    }

    public function down()
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->dropColumn('email_body');
        });
    }
};
