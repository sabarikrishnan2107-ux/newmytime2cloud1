<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutoRegenerateSetting extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'last_run_at' => 'datetime',
    ];

    public function branch()
    {
        return $this->belongsTo(CompanyBranch::class, 'branch_id');
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
