<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('is_active')->default(true);
            $table->string('inactive_reason_type', 40)->nullable();
            $table->text('inactive_reason_note')->nullable();
            $table->date('inactive_from')->nullable();
            $table->date('inactive_to')->nullable();
            $table->index(['is_active', 'inactive_to'], 'employees_is_active_to_idx');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex('employees_is_active_to_idx');
            $table->dropColumn([
                'is_active',
                'inactive_reason_type',
                'inactive_reason_note',
                'inactive_from',
                'inactive_to',
            ]);
        });
    }
};
