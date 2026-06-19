<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasColumn('devices', 'door_pin')) {
            Schema::table('devices', function (Blueprint $table) {
                $table->string('door_pin', 4)->nullable();
            });
        }

        // Backfill: copy each company's pin to its own devices.
        // Done in PHP (one UPDATE per company) so it works on MySQL and PostgreSQL.
        // Scoped by company_id so tenants on the shared DB do not bleed into each other.
        $companies = DB::table('companies')
            ->whereNotNull('pin')
            ->get(['id', 'pin']);

        foreach ($companies as $company) {
            DB::table('devices')
                ->where('company_id', $company->id)
                ->whereNull('door_pin')
                ->update(['door_pin' => $company->pin]);
        }
    }

    public function down()
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn('door_pin');
        });
    }
};
