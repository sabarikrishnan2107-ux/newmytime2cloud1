<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_type',
        'name',
        'email',
        'password',
        'role_id',
        'company_id',
        'branch_id',
        'is_master',
        'first_login',
        'reset_password_code',
        'employee_role_id',
        'email_verified_at',
        'enable_whatsapp_otp',
        'order',

        'notify',
        'start_date',
        'end_date',

        "employee_id",

        "mobile_app_login_access",
        "mobile_punch",
        "tracking_status",
        "web_login_access"

    ];

    protected $with = ['assigned_permissions'];

    protected $appends = ['start_date_display', 'end_date_display', 'start_date_edit', 'end_date_edit'];

    public function getStartDateDisplayAttribute()
    {
        return $this->start_date ? Carbon::parse($this->start_date)->format('d M Y') : null;
    }

    /**
     * Accessor for end_date_display
     */
    public function getEndDateDisplayAttribute()
    {
        return $this->end_date ? Carbon::parse($this->end_date)->format('d M Y') : null;
    }

    public function getStartDateEditAttribute()
    {
        return $this->start_date ? Carbon::parse($this->start_date)->format('Y-m-d') : null;
    }

    /**
     * Accessor for end_date_display
     */
    public function getEndDateEditAttribute()
    {
        return $this->end_date ? Carbon::parse($this->end_date)->format('Y-m-d') : null;
    }

    public function assigned_permissions()
    {
        return $this->hasOne(AssignPermission::class, 'role_id', 'role_id');
    }

    public function branches()
    {
        return $this->belongsToMany(CompanyBranch::class, 'user_branches', 'user_id', 'branch_id');
    }

    public function departments()
    {
        return $this->belongsToMany(Department::class, 'user_departments');
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */

    protected $casts = [
        'notify' => 'boolean',
        'mobile_punch' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
        'email_verified_at' => 'datetime',
        'created_at' => 'datetime:d-M-y',
    ];

    // public function company()
    // {
    //     return $this->hasOne(Company::class);
    // }

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
    public function branchLogin()
    {
        return $this->hasOne(CompanyBranch::class, 'user_id');
    }

    public function employeeData()
    {
        return $this->belongsTo(Employee::class, 'user_id', 'id');
    }
    public function employee()
    {
        return $this->hasOne(Employee::class)->with(["schedule_active"]);
    }

    public function login_employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id')->with("department.branch:id,branch_name as name")->withOut("schedule", "sub_department", "branch", "user");
    }

    public function role()
    {
        return $this->belongsTo(Role::class, "role_id")->withDefault([
            "name" => "---",
        ]);
    }

    public function employee_role()
    {
        return $this->belongsTo(Role::class, "employee_role_id");
    }

    // public function role()
    // {
    //     return $this->belongsTo(Role::class);
    // }

    protected static function boot()
    {
        parent::boot();

        // Order by name DESC
        // static::addGlobalScope('order', function (Builder $builder) {
        //     $builder->orderBy('id', 'desc');
        // });
    }
}
