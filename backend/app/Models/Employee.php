<?php

namespace App\Models;

use App\Models\Leave;
use App\Models\Timezone;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Employee extends Model
{
    use HasFactory;

    // protected $with = [];

    protected $with = ["schedule", "department", "designation", "department", "sub_department", 'branch', 'user'];

    protected $guarded = [];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        // 'joining_date' => 'date:Y/m/d',
        'created_at' => 'datetime:d-M-y',

        'contact'            => 'array',
        'present_address'    => 'array',
        'permanent_address'  => 'array',
        'primary_contact'    => 'array',
        'secondary_contact'  => 'array',

        'is_active'          => 'boolean',
        'inactive_from'      => 'date:Y-m-d',
        'inactive_to'        => 'date:Y-m-d',
    ];

    protected $appends = ['show_joining_date', 'profile_picture_raw', 'edit_joining_date', 'name_with_user_id', 'full_name', 'profile_picture_base64'];

    public function schedule()
    {
        return $this->hasOne(ScheduleEmployee::class, "employee_id", "system_user_id")
            // ->where('from_date', '<=', date('Y-m-d'))
            // ->where('to_date', '>=', date('Y-m-d'))
            // ->orderBy('from_date', 'desc')
            ->withDefault([
                "shift_type_id" => "---",
                "shift_type" => [
                    "name" => "---",
                ],
            ]);
    }
    public function schedule_active()
    {
        return $this->hasOne(ScheduleEmployee::class, 'employee_id', 'system_user_id')
            ->whereHas('shift', function ($query) {
                $query->where('from_date', '<=', date('Y-m-d'))
                    ->where('to_date', '>=', date('Y-m-d'));
            })
            ->orderBy('updated_at', 'desc')
            ->withDefault([
                "shift_type_id" => "---",
                "shift_type" => [
                    "name" => "---",
                ],
            ]);
    }

    public function schedule_all()
    {
        return $this->hasMany(ScheduleEmployee::class, "employee_id", "system_user_id");
    }

    public function palms()
    {
        return $this->hasMany(Palm::class, "employee_id", "system_user_id");
    }


    public function finger_prints()
    {
        return $this->hasMany(FingerPrint::class, "employee_id", "system_user_id");
    }

    public function latestSchedule()
    {
        return $this->hasOne(ScheduleEmployee::class, 'employee_id', 'system_user_id')->latest();
    }


    public function announcements()
    {
        return $this->belongsToMany(Announcement::class)->withTimestamps();
    }

    public function user()
    {
        return $this->belongsTo(User::class)->withDefault([
            "email" => null,
        ]);
    }

    public function login_user()
    {
        return $this->hasOne(User::class);
    }

    public function timezone()
    {
        return $this->belongsTo(Timezone::class, 'timezone_id', 'timezone_id')->withDefault([
            "timezone_name" => "---",
        ]);
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class)->withDefault([
            "name" => "---",
        ]);
    }
    public function leave_group()
    {
        return $this->belongsTo(LeaveGroups::class, "leave_group_id", "id");
    }
    public function reporting_manager()
    {
        return $this->belongsTo(Employee::class, "reporting_manager_id", "id");
    }


    public function role()
    {
        return $this->belongsTo(Role::class)->withDefault([
            "name" => "---",
        ]);
    }

    public function payroll()
    {
        return $this->hasOne(Payroll::class);
    }

    public function passport()
    {
        return $this->hasOne(Passport::class);
    }

    public function emirate()
    {
        return $this->hasOne(EmiratesInfo::class);
    }
    public function visa()
    {
        return $this->hasOne(Visa::class);
    }
    public function qualification()
    {
        return $this->hasOne(Qualification::class)->withDefault([
            "certificate" => "---",
        ]);
    }

    public function bank()
    {
        return $this->hasOne(BankInfo::class)->withDefault([
            "bank_name" => "---",
            "account_no" => "---",
            "account_title" => "---",
            "address" => "---",
            "iban" => "---",
        ]);
    }

    public function department()
    {
        return $this->belongsTo(Department::class)->withDefault([
            "name" => "---",
        ]);
    }

    public function sub_department()
    {
        return $this->belongsTo(SubDepartment::class)->withDefault([
            "name" => "---",
        ]);
    }

    public function getProfilePictureAttribute($value)
    {
        if (!$value) {
            return null;
        }

        if (file_exists(public_path('media/employee/profile_picture/' . $value))) {
            return asset('media/employee/profile_picture/' . $value);
        }

        return "https://backend.mytime2cloud.com/media/employee/profile_picture/$value";
    }

    public function getProfilePictureBase64Attribute()
    {
        return null;
        if ($this->profile_picture) {
            $imageData = file_get_contents($this->profile_picture);

            $md5string = base64_encode($imageData);

            return "data:image/png;base64,$md5string";
        }

        return null;
    }

    public function getProfilePictureRawAttribute()
    {
        // Ensure profile_picture exists and is not empty
        if (empty($this->profile_picture)) {
            return ''; // Return an empty string if profile_picture is not set
        }

        // Split the path string
        $arr = explode('media/employee/profile_picture/', $this->profile_picture);

        // Return the part after 'media/employee/profile_picture/' or an empty string if not found
        return isset($arr[1]) ? $arr[1] : '';
    }

    public function getCreatedAtAttribute($value): string
    {
        return date('d M Y', strtotime($value));
    }

    public function getShowJoiningDateAttribute(): string
    {
        return date('d M Y', strtotime($this->joining_date));
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }




    public function getEditJoiningDateAttribute(): string
    {
        return date('Y-m-d', strtotime($this->joining_date));
    }
    // public function getNameAttribute(): string
    // {
    //     return $this->first_name ?? "";
    // }

    // public function getFullNameAttribute(): string
    // {
    //     return $this->first_name . " " . $this->last_name ?? "---";
    // }

    public function getNameWithUserIDAttribute()
    {
        return $this->first_name . ' ' . $this->last_name . " - " . $this->employee_id;
    }

    // use Illuminate\Database\Eloquent\Builder;

    protected static function boot()
    {
        parent::boot();

        // Order by name ASC
        static::addGlobalScope('order', function (Builder $builder) {
            // $builder->orderBy('id', 'desc');
        });
    }

    public function company()
    {
        return $this->belongsTo(Company::class)->withDefault([
            "name" => "---",
        ]);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, "employee_id", "system_user_id");
    }


    public function today_absent()
    {
        return $this->hasOne(Attendance::class, "employee_id", "system_user_id")->where("status", "A")->whereDate("date", date("Y-m-d"));
    }

    public function attendance_logs()
    {
        return $this->hasMany(AttendanceLog::class, "UserID", "system_user_id");
    }

    public function timezones_mapped()
    {
        return $this->hasMany(TimezoneEmployees::class, "employee_table_id", "id");
    }


    public function today_logs()
    {
        return $this->hasMany(AttendanceLog::class, "UserID", "system_user_id");
    }

    public function announcement()
    {
        return $this->belongsToMany(Announcement::class)->withTimestamps();
    }
    public function branch()
    {
        return $this->belongsTo(CompanyBranch::class, "branch_id", "id");
    }

    public function branch_test()
    {
        return $this->belongsTo(CompanyBranch::class, "branch_id", "id")->with("departments");
    }
    /**
     * The roles that belong to the Employee
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function reportTo()
    {
        return $this->belongsToMany(Employee::class, 'employee_report', 'employee_id', 'report_id')->withTimestamps();
    }




    public function leave()
    {
        return $this->hasMany(Leave::class, 'employee_id', 'employee_id');
    }

    public function scopeFilter($query, $search)
    {
        $search = strtolower($search);
        $query->when($search ?? false, fn($query, $search) =>
        $query->where(
            fn($query) => $query
                ->where('employee_id', $search)
                ->orWhere(DB::raw('lower(first_name)'), 'Like', '%' . $search . '%')
                ->orWhere(DB::raw('lower(last_name)'), 'Like', '%' . $search . '%')
                ->orWhere(DB::raw('lower(phone_number)'), 'Like', '%' . $search . '%')
                ->orWhere(DB::raw('lower(local_email)'), 'Like', '%' . $search . '%')
                ->orWhere(DB::raw('lower(system_user_id)'), 'Like', '%' . $search . '%')
                ->whereNotNull('first_name')
            // ->orWhere('whatsapp_number', 'Like', '%' . $search . '%')
            // ->orWhere('phone_relative_number', 'Like', '%' . $search . '%')
            // ->orWhere('whatsapp_relative_number', 'Like', '%' . $search . '%')
            // ->orWhereHas(
            //     'user',
            //     fn ($query) =>
            //     $query->Where('email', 'Like', '%' . $search . '%')
            // )
            // ->orWhereHas(
            //     'designation',
            //     fn ($query) =>
            //     $query->Where('name', 'Like', '%' . $search . '%')
            // )
            // ->orWhereHas(
            //     'department',
            //     fn ($query) =>
            //     $query->Where('name', 'Like', '%' . $search . '%')
            // )
        ));
    }

    public function filter($request)
    {
        $model = self::query();

        $model->with([
            "finger_prints",
            "palms",
            "user" => function ($q) {
                return $q->with("role");
            },
        ])
            ->with([

                "user" => function ($q) {
                    return $q->with(["branchLogin", "role"]);
                },
            ])
            ->with([
                "reportTo",
                "schedule_all",
                "branch",
                "department",
                "department.branch",
                "sub_department",
                "designation",
                "payroll",
                "timezone",
                "passport",
                "emirate",
                "qualification",
                "bank",
                "leave_group",
                "Visa",
                "reporting_manager",
            ])
            ->with(["schedule" => function ($q) {
                $q->with("roster");
            }])
            ->where('company_id', $request->company_id)


            ->when($request->filled('department_ids') && count($request->department_ids) > 0, function ($q) use ($request) {
                $q->whereHas('department', fn(Builder $query) => $query->whereIn('department_id', $request->department_ids));
            })

            ->when($request->filled('department_id'), function ($q) use ($request) {
                $q->whereHas('department', fn(Builder $query) => $query->where('department_id', $request->department_id));
            })
            //filters
            ->when($request->filled('employee_id'), function ($q) use ($request) {
                //$q->where('employee_id', 'LIKE', "$key%");
                $q->where(function ($q) use ($request) {
                    $q->Where('employee_id', env('WILD_CARD') ?? 'ILIKE', "$request->employee_id%");
                    $q->orWhere('system_user_id', env('WILD_CARD') ?? 'ILIKE', "$request->employee_id%");
                });
            })
            ->when($request->filled('id'), function ($q) use ($request) {

                $q->where('id',   $request->id);
            })
            ->when($request->filled('phone_number'), function ($q) use ($request) {

                $q->where('phone_number', env('WILD_CARD') ?? 'ILIKE', "$request->phone_number%");
            })
            ->when($request->filled('first_name'), function ($q) use ($request) {
                $q->where(function ($q) use ($request) {
                    $q->Where('first_name', env('WILD_CARD') ?? 'ILIKE', "$request->first_name%");
                    //$q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "$request->first_name%");
                });
            })

            ->when($request->filled('user_email'), function ($q) use ($request) {
                // $q->where('local_email', 'LIKE', "$request->user_email%");
                $q->whereHas('user', fn(Builder $query) => $query->where('email', env('WILD_CARD') ?? 'ILIKE', "$request->user_email%"));
            })
            ->when($request->filled('department_name_id'), function ($q) use ($request) {
                // $q->whereHas('department', fn(Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->department_name%"));
                $q->whereHas('department', fn(Builder $query) => $query->where('id', $request->department_name_id));
            })

            ->when($request->filled('shceduleshift_id'), function ($q) use ($request) {
                $q->whereHas('schedule', fn(Builder $query) => $query->where('shift_id', $request->shceduleshift_id));
            })
            ->when($request->filled('schedule_shift_name'), function ($q) use ($request) {
                $q->whereHas('schedule.shift', fn(Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->schedule_shift_name%"));
                $q->whereHas('schedule.shift', fn(Builder $query) => $query->whereNotNull('name'));
                $q->whereHas('schedule.shift', fn(Builder $query) => $query->where('name', '<>', '---'));
            })
            // ->when($request->filled('timezone_name'), function ($q) use ($request) {
            //     $q->whereHas('timezone', fn (Builder $query) => $query->where('timezone_name', env('WILD_CARD') ?? 'ILIKE', "$request->timezone_name%"));
            // })
            // ->when($request->filled('timezone'), function ($q) use ($request) {
            //     $q->whereHas('timezone', fn (Builder $query) => $query->where('timezone_id', $request->timezone));
            // })

            ->when($request->filled('timezone_id'), function ($q) use ($request) {
                $q->whereHas('timezone', fn(Builder $query) => $query->where('id', $request->timezone_id));
            })

            ->when($request->filled('payroll_basic_salary'), function ($q) use ($request) {
                $q->whereHas('payroll', fn(Builder $query) => $query->where('basic_salary', '=', $request->payroll_basic_salary));
            })
            ->when($request->filled('payroll_net_salary'), function ($q) use ($request) {
                $q->whereHas('payroll', fn(Builder $query) => $query->where('net_salary', '=', $request->payroll_net_salary));
            })

            ->when($request->filled("department_branch_id"), function ($q) use ($request) {
                //$q->whereHas('department', fn (Builder $query) => $query->where('branch_id', '=', $request->department_branch_id));
                $q->where('branch_id', '=', $request->branch_id);
            })
            ->when($request->filled("branch_id"), function ($q) use ($request) {
                $q->where('branch_id', '=', $request->branch_id);
                // $q->whereHas('department', fn (Builder $query) => $query->where('branch_id', '=', $request->branch_id));
            })
            ->when($request->filled("filter_branch_id"), function ($q) use ($request) {
                $q->where('branch_id', '=', $request->filter_branch_id);
                // $q->whereHas('department', fn (Builder $query) => $query->where('branch_id', '=', $request->filter_branch_id));
            })



            // ->when($request->filled('sortBy'), function ($q) use ($request) {
            //     $sortDesc = $request->input('sortDesc');
            //     $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc');
            // })

            ->when($request->filled('sortBy'), function ($q) use ($request) {
                $sortDesc = $request->input('sortDesc');
                if (strpos($request->sortBy, '.')) {
                    if ($request->sortBy == 'department.name.id' || $request->sortBy == 'department_name_id') {
                        $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'user.email') {
                        $q->orderBy(User::select("email")->whereColumn("users.id", "employees.user_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'schedule.shift_name') {
                        // $q->orderBy(Schedule::select("shift")->whereColumn("schedule_employees.employee_id", "employees.id"), $sortDesc == 'true' ? 'desc' : 'asc');

                    } else
                    if ($request->sortBy == 'timezone.name') {
                        $q->orderBy(Timezone::select("timezone_name")->whereColumn("timezones.id", "employees.timezone_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'payroll.basic_salary') {
                        $q->orderBy(Payroll::select("basic_salary")->whereColumn("payrolls.employee_id", "employees.id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'payroll.net_salary') {
                        $q->orderBy(Payroll::select("net_salary")->whereColumn("payrolls.employee_id", "employees.id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    }
                } else if ($request->sortBy == 'department_name_id') {
                    $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                } else {
                    $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                    }
                }
            });

        if (!$request->sortBy) {
            $model->orderBy('first_name', 'asc');
        }

        return $model;
    }

    public function filterV1($request)
    {


        $model = self::query();

        $model = $model->where('company_id', $request->company_id);
        if ($request->user_type == "department") {
            $model->whereHas("department", fn($q) => $q->where("id", $request->department_id));
        }

        $model->orderBy('id', 'desc');


        $model->with([
            "finger_prints",
            "palms",
            "user" => function ($q) {
                return $q->with(["branchLogin", "role"]);
            },
        ])
            ->with([
                "reportTo",
                "schedule_all",
                "branch",
                "department",
                "department.branch",
                "sub_department",
                "designation",
                "payroll",
                "timezone",
                "passport",
                "emirate",
                "qualification",
                "bank",
                "leave_group",
                "Visa",
                "reporting_manager",
            ])
            ->with(["schedule" => function ($q) {
                $q->with("roster");
            }])
            ->where('company_id', $request->company_id)

            ->when($request->filled("branch_id"), function ($q) use ($request) {
                $q->where('branch_id', '=', $request->branch_id);
                // $q->whereHas('department', fn (Builder $query) => $query->where('branch_id', '=', $request->branch_id));
            })

            ->when($request->filled("branch_ids"), function ($q) use ($request) {
                $q->whereIn('branch_id', $request->branch_ids);
            })

            ->when($request->filled("department_ids"), function ($q) use ($request) {
                $q->whereIn('department_id', $request->department_ids);
            })


            ->when($request->filled("filter_branch_id"), function ($q) use ($request) {
                $q->where('branch_id', '=', $request->filter_branch_id);
                // $q->whereHas('department', fn (Builder $query) => $query->where('branch_id', '=', $request->filter_branch_id));
            })

            ->when($request->filled('search'), function ($q) use ($request) {
                // Add where clause for company_id
                $q->where('company_id', $request->company_id);

                // Add where clauses for various fields using ILIKE for case-insensitive matching
                $q->where(function ($q) use ($request) {
                    //$searchTerm = "%{$request->search}%";
                    $searchTerm = "{$request->search}%";

                    $q->where('system_user_id', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                        ->orWhere('employee_id', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                        ->orWhere('first_name', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                        ->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', $searchTerm);
                    // ->orWhere('full_name', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                    // ->orWhere('phone_number', env('WILD_CARD') ?? 'ILIKE', $searchTerm);
                    // ->orWhere('local_email', env('WILD_CARD') ?? 'ILIKE', $searchTerm);
                });

                // Add whereHas clauses for related models branch and department
                $q->orWhereHas('branch', function ($query) use ($request) {
                    $query->where('company_id', $request->company_id);
                    $query->where('branch_name', env('WILD_CARD') ?? 'ILIKE', "{$request->search}%");
                });

                $q->orWhereHas('department', function ($query) use ($request) {
                    $query->where('company_id', $request->company_id);
                    $query->where('name', env('WILD_CARD') ?? 'ILIKE', "{$request->search}%");
                });
            })

            // ->when($request->filled('search'), function ($q) use ($request) {

            //     $q->Where('system_user_id', env('WILD_CARD') ?? 'ILIKE', "%$request->search%");
            //     $q->orWhere('employee_id', env('WILD_CARD') ?? 'ILIKE', "%$request->search%");
            //     $q->orWhere('first_name', env('WILD_CARD') ?? 'ILIKE', "%$request->search%");
            //     $q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "%$request->search%");
            //     $q->orWhere('full_name', env('WILD_CARD') ?? 'ILIKE', "%$request->search%");
            //     $q->orWhere('phone_number', env('WILD_CARD') ?? 'ILIKE', "%$request->search%");
            //     $q->orWhere('local_email', env('WILD_CARD') ?? 'ILIKE', "%$request->search%");

            //     $q->orWhereHas('branch', fn (Builder $query) => $query->where('branch_name', env('WILD_CARD') ?? 'ILIKE', "$request->search%"));
            //     $q->orWhereHas('department', fn (Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->search%"));
            // });


            ->when($request->filled('sortBy'), function ($q) use ($request) {
                $sortDesc = $request->input('sortDesc');
                if (strpos($request->sortBy, '.')) {
                    if ($request->sortBy == 'department.name.id' || $request->sortBy == 'department_name_id') {
                        $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'user.email') {
                        $q->orderBy(User::select("email")->whereColumn("users.id", "employees.user_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'schedule.shift_name') {
                        // $q->orderBy(Schedule::select("shift")->whereColumn("schedule_employees.employee_id", "employees.id"), $sortDesc == 'true' ? 'desc' : 'asc');

                    } else
                    if ($request->sortBy == 'timezone.name') {
                        $q->orderBy(Timezone::select("timezone_name")->whereColumn("timezones.id", "employees.timezone_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    }
                } else if ($request->sortBy == 'department_name_id') {
                    $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                } else {
                    $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                    }
                }
            });

        if (!$request->sortBy) {
            $model->orderBy('first_name', 'asc');
        }



        return $model;
    }

    public function document_expiry_filter($request)
    {
        $model = self::query();

        $model
            ->where('company_id', $request->company_id)


            ->when($request->filled('department_ids') && count($request->department_ids) > 0, function ($q) use ($request) {
                $q->whereHas('department', fn(Builder $query) => $query->whereIn('department_id', $request->department_ids));
            })

            ->when($request->filled('department_id'), function ($q) use ($request) {
                $q->whereHas('department', fn(Builder $query) => $query->where('department_id', $request->department_id));
            })
            //filters
            ->when($request->filled('employee_id'), function ($q) use ($request) {
                //$q->where('employee_id', 'LIKE', "$key%");
                $q->where(function ($q) use ($request) {
                    $q->Where('employee_id', env('WILD_CARD') ?? 'ILIKE', "$request->employee_id%");
                    $q->orWhere('system_user_id', env('WILD_CARD') ?? 'ILIKE', "$request->employee_id%");
                });
            })
            ->when($request->filled('id'), function ($q) use ($request) {

                $q->where('id',   $request->id);
            })
            ->when($request->filled('phone_number'), function ($q) use ($request) {

                $q->where('phone_number', env('WILD_CARD') ?? 'ILIKE', "$request->phone_number%");
            })
            ->when($request->filled('first_name'), function ($q) use ($request) {
                $q->where(function ($q) use ($request) {
                    $q->Where('first_name', env('WILD_CARD') ?? 'ILIKE', "$request->first_name%");
                    //$q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "$request->first_name%");
                });
            })

            ->when($request->filled('user_email'), function ($q) use ($request) {
                // $q->where('local_email', 'LIKE', "$request->user_email%");
                $q->whereHas('user', fn(Builder $query) => $query->where('email', env('WILD_CARD') ?? 'ILIKE', "$request->user_email%"));
            })
            ->when($request->filled('department_name_id'), function ($q) use ($request) {
                // $q->whereHas('department', fn(Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->department_name%"));
                $q->whereHas('department', fn(Builder $query) => $query->where('id', $request->department_name_id));
            })

            ->when($request->filled('shceduleshift_id'), function ($q) use ($request) {
                $q->whereHas('schedule', fn(Builder $query) => $query->where('shift_id', $request->shceduleshift_id));
            })
            ->when($request->filled('schedule_shift_name'), function ($q) use ($request) {
                $q->whereHas('schedule.shift', fn(Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->schedule_shift_name%"));
                $q->whereHas('schedule.shift', fn(Builder $query) => $query->whereNotNull('name'));
                $q->whereHas('schedule.shift', fn(Builder $query) => $query->where('name', '<>', '---'));
            })
            // ->when($request->filled('timezone_name'), function ($q) use ($request) {
            //     $q->whereHas('timezone', fn (Builder $query) => $query->where('timezone_name', env('WILD_CARD') ?? 'ILIKE', "$request->timezone_name%"));
            // })
            // ->when($request->filled('timezone'), function ($q) use ($request) {
            //     $q->whereHas('timezone', fn (Builder $query) => $query->where('timezone_id', $request->timezone));
            // })

            ->when($request->filled('timezone_id'), function ($q) use ($request) {
                $q->whereHas('timezone', fn(Builder $query) => $query->where('id', $request->timezone_id));
            })

            ->when($request->filled('payroll_basic_salary'), function ($q) use ($request) {
                $q->whereHas('payroll', fn(Builder $query) => $query->where('basic_salary', '=', $request->payroll_basic_salary));
            })
            ->when($request->filled('payroll_net_salary'), function ($q) use ($request) {
                $q->whereHas('payroll', fn(Builder $query) => $query->where('net_salary', '=', $request->payroll_net_salary));
            })

            ->when($request->filled("department_branch_id"), function ($q) use ($request) {
                //$q->whereHas('department', fn (Builder $query) => $query->where('branch_id', '=', $request->department_branch_id));
                $q->where('branch_id', '=', $request->branch_id);
            })
            ->when($request->filled("branch_id"), function ($q) use ($request) {
                $q->where('branch_id', '=', $request->branch_id);
                // $q->whereHas('department', fn (Builder $query) => $query->where('branch_id', '=', $request->branch_id));
            })
            ->when($request->filled("filter_branch_id"), function ($q) use ($request) {
                $q->where('branch_id', '=', $request->filter_branch_id);
                // $q->whereHas('department', fn (Builder $query) => $query->where('branch_id', '=', $request->filter_branch_id));
            })



            // ->when($request->filled('sortBy'), function ($q) use ($request) {
            //     $sortDesc = $request->input('sortDesc');
            //     $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc');
            // })

            ->when($request->filled('sortBy'), function ($q) use ($request) {
                $sortDesc = $request->input('sortDesc');
                if (strpos($request->sortBy, '.')) {
                    if ($request->sortBy == 'department.name.id' || $request->sortBy == 'department_name_id') {
                        $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'user.email') {
                        $q->orderBy(User::select("email")->whereColumn("users.id", "employees.user_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'schedule.shift_name') {
                        // $q->orderBy(Schedule::select("shift")->whereColumn("schedule_employees.employee_id", "employees.id"), $sortDesc == 'true' ? 'desc' : 'asc');

                    } else
                    if ($request->sortBy == 'timezone.name') {
                        $q->orderBy(Timezone::select("timezone_name")->whereColumn("timezones.id", "employees.timezone_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'payroll.basic_salary') {
                        $q->orderBy(Payroll::select("basic_salary")->whereColumn("payrolls.employee_id", "employees.id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    } else
                    if ($request->sortBy == 'payroll.net_salary') {
                        $q->orderBy(Payroll::select("net_salary")->whereColumn("payrolls.employee_id", "employees.id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    }
                } else if ($request->sortBy == 'department_name_id') {
                    $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                } else {
                    $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                    }
                }
            });

        if (!$request->sortBy) {
            $model->orderBy('first_name', 'asc');
        }

        return $model;
    }


    public function attendanceEmployeeForMulti($params)
    {
        $employees = Employee::query();
        $employees->when(count($params["UserIds"] ?? []) > 0, function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->whereIn("system_user_id", $params["UserIds"]);
        });
        $employees->where("company_id", $params["company_id"]);
        $employees->withOut(["department", "sub_department", "designation"]);
        $employees->whereHas("attendance_logs", function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->where("LogTime", ">=", $params["date"]); // Check for logs on or after the current date
            $q->where("LogTime", "<=", date("Y-m-d", strtotime($params["date"] . " +1 day"))); // Check for logs on or before the next date
            // $q->where("checked", false);
            // $q->where("UserID",707);
        });

        $employees->with(["schedule" => function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->where("to_date", ">=", $params["date"]);
            $q->where("shift_type_id", $params["shift_type_id"]);
            $q->withOut("shift_type");
            // $q->select("shift_id", "isOverTime", "employee_id", "shift_type_id", "shift_id", "shift_id");
            $q->orderBy("to_date", "asc");
        }]);

        return $employees->get(["system_user_id"]);
    }

    public function attendanceEmployeeForMultiRender($params)
    {
        $employees = Employee::query();
        $employees->where("company_id", $params["company_id"]);
        $employees->whereIn("system_user_id", $params["UserIds"] ?? []);
        $employees->withOut(["department", "sub_department", "designation"]);
        $employees->whereHas("attendance_logs", function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->where("LogTime", ">=", $params["date"]); // Check for logs on or after the current date
            $q->where("LogTime", "<=", date("Y-m-d", strtotime($params["date"] . " +1 day"))); // Check for logs on or before the next date
            // // $q->where("checked", false);
            // $q->where("UserID",707);
        });

        $employees->with(["schedule" => function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->where("to_date", ">=", $params["date"]);
            $q->where("shift_type_id", $params["shift_type_id"]);
            $q->withOut("shift_type");
            // $q->select("shift_id", "isOverTime", "employee_id", "shift_type_id", "shift_id", "shift_id");
            $q->orderBy("to_date", "asc");

            $q->whereHas("shift", function ($shiftQuery) use ($params) {
                $day = Carbon::parse($params["date"])->format("D");
                if (DB::getDriverName() === 'pgsql') {
                    $shiftQuery->whereJsonContains("days", $day);
                } else {
                    // SQLite fallback
                    $shiftQuery->where("days", "LIKE", '%"' . $day . '"%');
                }
            });
        }]);

        return $employees->get(["system_user_id"]);
    }
    public function GetEmployeeWithShiftDetails($params)
    {


        $employees = Employee::query();
        $employees->where("company_id", $params["company_id"]);
        $employees->whereIn("system_user_id", $params["UserIds"] ?? []);
        $employees->withOut(["department", "sub_department", "designation"]);


        $employees->with(["schedule" => function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->where("to_date", ">=", $params["date"]);
            $q->where("shift_type_id", $params["shift_type_id"]);
            $q->withOut("shift_type");
            // $q->select("shift_id", "isOverTime", "employee_id", "shift_type_id", "shift_id", "shift_id");
            $q->orderBy("to_date", "asc");
        }]);

        return $employees->get(["system_user_id"]);
    }

    public function attendanceEmployeeForRender($params)
    {
        $employees = Employee::query();
        $employees->where("company_id", $params["company_id"]);
        $employees->when(count($params["UserIds"] ?? []) > 0, function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->whereIn("system_user_id", $params["UserIds"]);
        });
        $employees->withOut(["department", "sub_department", "designation"]);

        $employees->whereHas("attendance_logs", function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->whereIn("UserID", $params["UserIds"]);
        });

        $employees->with(["schedule" => function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->where("to_date", ">=", $params["date"]);
            $q->where("shift_type_id", $params["shift_type_id"]);
            $q->withOut("shift_type");
            $q->select("shift_id", "isOverTime", "employee_id", "shift_type_id", "shift_id", "shift_id");
            $q->orderBy("to_date", "asc");
        }]);

        return $employees->get(["system_user_id"]);
    }

    public function scopeExcludeRelations($query)
    {
        return $query->withOut(["schedule", "department", "designation", "sub_department", "user", "branch"]);
    }

    public function isInactiveOn(\Carbon\Carbon $date): bool
    {
        if ($this->is_active) {
            return false;
        }
        if ($this->inactive_from && $date->lt(\Carbon\Carbon::parse($this->inactive_from))) {
            return false;
        }
        if ($this->inactive_to && $date->gt(\Carbon\Carbon::parse($this->inactive_to))) {
            return false;
        }
        return true;
    }

    public function inactiveReasonLabel(): string
    {
        if ($this->is_active) {
            return '';
        }
        return match ($this->inactive_reason_type) {
            'suspended'    => 'Suspended',
            'terminated'   => 'Terminated',
            'resigned'     => 'Resigned',
            'long_leave'   => 'Long Leave',
            'training'     => 'Training',
            'transfer_out' => 'Transfer Out',
            'other'        => 'Other',
            default        => 'Non-Active',
        };
    }
}
