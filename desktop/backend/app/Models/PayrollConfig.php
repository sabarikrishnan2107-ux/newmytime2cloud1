<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class PayrollConfig extends Model
{
    protected $guarded = [];
    protected $table = 'payroll_configs';

    protected $casts = [
        'late_slabs' => 'array',
        'leave_deduction_enabled' => 'boolean',
        'lock_after_approval' => 'boolean',
    ];
}
