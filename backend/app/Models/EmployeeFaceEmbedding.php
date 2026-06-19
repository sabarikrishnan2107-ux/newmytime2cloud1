<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeFaceEmbedding extends Model
{
    protected $fillable = ['employee_id', 'company_id', 'embedding'];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
