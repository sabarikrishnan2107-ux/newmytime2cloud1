<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('change_requests')) {
            return;
        }

        Schema::table('change_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('change_requests', 'from_time')) {
                $table->string('from_time')->nullable();
            }

            if (!Schema::hasColumn('change_requests', 'to_time')) {
                $table->string('to_time')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('change_requests')) {
            return;
        }

        Schema::table('change_requests', function (Blueprint $table) {
            $columnsToDrop = [];

            if (Schema::hasColumn('change_requests', 'from_time')) {
                $columnsToDrop[] = 'from_time';
            }

            if (Schema::hasColumn('change_requests', 'to_time')) {
                $columnsToDrop[] = 'to_time';
            }

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
