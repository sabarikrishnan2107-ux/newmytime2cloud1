<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Support\Facades\DB;

class UniqueValidation implements Rule
{
    protected $table;
    protected $column;

    public function __construct($table, $column)
    {
        $this->table = $table;
        $this->column = $column;
    }

    public function passes($attribute, $value)
    {
        $companyId = request()->input('company_id');

        $recordCount = DB::table($this->table)
            ->where($this->column, $value)
            ->where('company_id', $companyId)
            ->count();

        return $recordCount === 0;
    }

    public function message()
    {
        return 'The :attribute is already taken for this company.';
    }
}
