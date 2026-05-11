<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Column default = true so any future INSERT (including ones from the
        // master panel that doesn't know about this column) starts with wizard
        // mode enabled. Existing companies are explicitly flipped to false so
        // current customers aren't suddenly locked out of the UI.
        Schema::table('companies', function (Blueprint $table) {
            $table->boolean('wizard_mode')->default(true)->after('id');
        });

        DB::table('companies')->update(['wizard_mode' => false]);
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('wizard_mode');
        });
    }
};
