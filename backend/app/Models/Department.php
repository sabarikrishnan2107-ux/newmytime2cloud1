<?php

namespace App\Models;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;


class Department extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $appends = ['formatted_updated_at'];

    public function getFormattedUpdatedAtAttribute()
    {
        if ($this->updated_at) {
            return $this->updated_at->format('d-M-y');
        }
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_departments');
    }


    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function managers()
    {
        return $this->hasMany(User::class)->orderBy("id", "asc")->where("user_type", "department");
    }

    public function branch()
    {
        return $this->belongsTo(CompanyBranch::class, 'branch_id');
    }
    public function children()
    {
        return $this->hasMany(SubDepartment::class);
    }

    public function sub_departments()
    {
        return $this->hasMany(SubDepartment::class);
    }

    public function designations()
    {
        return $this->hasMany(Designation::class);
    }

    public function employees()
    {
        return $this->hasMany(Employee::class)->withOut(["schedule", "designation", "sub_department", "department"]);
    }


    protected $casts = [
        'created_at' => 'datetime:d-M-y',
        'updated_at' => 'datetime:d-M-y',
    ];

    // protected static function boot()
    // {
    // parent::boot();

    // Order by name ASC
    // static::addGlobalScope('order', function (Builder $builder) {
    //     $builder->orderBy('id', 'desc');
    // });
    // }

    public function filter($request)
    {
        $cols = $request->cols;

        $model = self::query();
        $model->where('company_id', $request->company_id);
        $model->with(['children', 'branch', 'designations', 'managers']);
        $model->where('company_id', $request->company_id);

        $model->when($request->filled('id'), function ($q) use ($request) {
            $q->where('id', 'LIKE', "$request->id%");
        });
        $model->when($request->filled('name'), function ($q) use ($request) {
            $q->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->name%");
        });
        $model->when($request->filled('serach_sub_department_name'), function ($q) use ($request) {
            $q->whereHas('children', fn(Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->serach_sub_department_name%"));
        });
        $model->when($request->filled('serach_designation_name'), function ($q) use ($request) {
            $q->whereHas('designations', fn(Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->serach_designation_name%"));
        });
        $model->when(isset($cols) && count($cols) > 0, function ($q) use ($cols) {
            $q->select($cols);
        });
        $model->when($request->filled('sortBy'), function ($q) use ($request) {
            $sortDesc = $request->input('sortDesc');
            if (strpos($request->sortBy, '.')) {
                if ($request->sortBy == 'department.name.id') {
                    $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                }
            } else {
                $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                }
            }
        });

        // $model->when($request->filled("branch_id"), function ($q) use ($request) {
        //     return $q->where("branch_id", $request->branch_id);
        // });

        // $model->when($request->filled("filter_branch_id"), function ($q) use ($request) {
        //     return $q->where("branch_id", $request->filter_branch_id);
        // });


        $model->when(request()->filled('department_ids'), fn($q) => $q->whereIn('id', request('department_ids')));
        // $model->when(request()->filled('branch_ids'), fn($q) => $q->whereIn('branch_id', request('branch_ids')));

        return $model;
    }
}
