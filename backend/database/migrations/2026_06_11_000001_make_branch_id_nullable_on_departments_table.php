<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * A department with branch_id = NULL is a company-wide (common)
     * department shared across all branches, e.g. Accounts or HR.
     */
    public function up()
    {
        DB::statement('ALTER TABLE departments ALTER COLUMN branch_id DROP NOT NULL');
    }

    public function down()
    {
        DB::statement('ALTER TABLE departments ALTER COLUMN branch_id SET NOT NULL');
    }
};
