<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeLeaves extends Model
{
    use HasFactory;

    protected $guarded = [];
    protected $table = "employee_leaves";

    const PENDING = 0;
    const APPROVED = 1;
    const REJECTED = 2;

    protected $casts = [
        'created_at' => 'datetime:d-M-y H:i',
    ];
    public function leave_type()
    {
        return $this->belongsTo(LeaveType::class)->withDefault([
            "name" => "---",
            "short_name" => "---",
        ]);
    }
    public function employee()
    {
        return $this->belongsTo(Employee::class, "employee_id", "id")->withDefault([
            "first_name" => "---",
            "last_name" => "---",
        ]);
    }

    public function alternate_employee()
    {
        return $this->belongsTo(Employee::class, "alternate_employee_id", "id");
    }

    public function reporting()
    {
        return $this->belongsTo(Employee::class, "reporting_manager_id", "id")->withDefault([
            "first_name" => "---",
            "last_name" => "---",
        ]);
    }

    /**
     * Get all of the employee_leave_timelines for the EmployeeLeaves
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function employee_leave_timelines()
    {
        return $this->hasMany(EmployeeLeaveTimeline::class, "employee_leave_id")->latest();
    }
    protected static function boot()
    {
        parent::boot();

        // Order by name ASC
        static::addGlobalScope('order', function (Builder $builder) {
            $builder->orderBy('id', 'desc');
        });
    }
}
