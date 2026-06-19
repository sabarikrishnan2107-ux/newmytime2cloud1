<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_leaves', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_leaves', 'day_type')) {
                $table->string('day_type', 32)->default('full')->after('end_date');
            }
            if (!Schema::hasColumn('employee_leaves', 'emergency_contact')) {
                $table->string('emergency_contact', 64)->nullable()->after('day_type');
            }
            if (!Schema::hasColumn('employee_leaves', 'is_draft')) {
                $table->boolean('is_draft')->default(false)->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_leaves', function (Blueprint $table) {
            if (Schema::hasColumn('employee_leaves', 'day_type')) {
                $table->dropColumn('day_type');
            }
            if (Schema::hasColumn('employee_leaves', 'emergency_contact')) {
                $table->dropColumn('emergency_contact');
            }
            if (Schema::hasColumn('employee_leaves', 'is_draft')) {
                $table->dropColumn('is_draft');
            }
        });
    }
};
