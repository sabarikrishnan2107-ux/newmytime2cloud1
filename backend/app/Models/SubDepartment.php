<?php

namespace App\Models;

use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubDepartment extends Model
{
    use HasFactory;

    protected $guarded = [];

    // app/Models/Department.php

    protected $appends = ['formatted_updated_at'];

    public function getFormattedUpdatedAtAttribute()
    {
        if ($this->updated_at) {
            return $this->updated_at->format('d-M-y');
        }
    }

    protected $casts = [
        'created_at' => 'datetime:d-M-y',
    ];

    /**
     * Get the department that owns the SubDepartment
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    // In SubDepartment.php
    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}
