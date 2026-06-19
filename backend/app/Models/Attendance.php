<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;
use App\Services\Attendance\AttendanceWeekOffService;

class Attendance extends Model
{
    use HasFactory;

    const ABSENT = "A"; //1;
    const PRESENT = "P"; //2;
    const MISSING = "M"; //3;


    const DAY_MAP = [
        'Mon' => 'M',
        'Tue' => 'T',
        'Wed' => 'W',
        'Thu' => 'Th',
        'Fri' => 'F',
        'Sat' => 'S',
        'Sun' => 'Su'
    ];

    protected $guarded = [];

    protected $appends = [
        "edit_date",
        "day",
    ];

    protected $casts = [
        'date' => 'date',
        'logs' => 'array',
        'shift_type_id' => 'integer',
        'is_manual_entry' => 'boolean',
    ];

    protected $hidden = ["branch_id", "created_at", "updated_at"];
    // protected $hidden = ["company_id", "branch_id", "created_at", "updated_at"];

    public function shift()
    {
        return $this->belongsTo(Shift::class)->withOut("shift_type");
    }

    public function shift_type()
    {
        return $this->belongsTo(ShiftType::class);
    }

    public function getDateAttribute($value)
    {
        return date("d M y", strtotime($value));
    }

    public function getDayAttribute()
    {
        // return date("D", strtotime($this->date));
        return date("l", strtotime($this->date));
    }
    public function getHrsMins($difference)
    {
        $h = floor($difference / 3600);
        $h = $h < 0 ? "0" : $h;
        $m = floor($difference % 3600) / 60;
        $m = $m < 0 ? "0" : $m;

        return (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
    }

    // public function getTotalHrsAttribute($value)
    // {
    //     return strtotime($value) < strtotime('18:00') ? $value : '00:00';
    // }

    /**
     * Get the user that owns the Attendance
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function device_in()
    {
        return $this->belongsTo(Device::class, 'device_id_in', 'device_id')->withDefault([
            'name' => '---',
        ]);
    }

    /**
     * Get the user that owns the Attendance
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function device_out()
    {
        return $this->belongsTo(Device::class, 'device_id_out', 'device_id')->withDefault([
            'name' => '---',
        ]);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, "employee_id", "system_user_id")->withOut("schedule")->withDefault([
            'first_name' => '---',
            "department" => ["name" => "---"],
        ]);
    }

    /**
     * Resolve employee relations that came back as the default '---' fallback.
     *
     * Background: attendances.employee_id should reference employees.system_user_id, but
     * some legacy rows (mostly older employees where employee_id != system_user_id) hold
     * the badge value (employees.employee_id) instead. The default belongsTo() join then
     * fails and the report shows '---' name / no department / no profile.
     *
     * This walks an iterable of Attendance records, finds ones whose loaded `employee`
     * is the default placeholder, and re-attaches the real Employee by matching on the
     * badge field. Lookups are batched into one query to avoid N+1.
     *
     * Safe to call on a Collection, LengthAwarePaginator, or any iterable of Attendance.
     */
    public static function rehydrateEmployeesByBadge($records, $companyId, ?array $employeeColumns = null, array $employeeWith = ['department:id,name', 'branch:id,branch_name'])
    {
        if (empty($records)) {
            return $records;
        }

        // Collect attendance.employee_id values whose employee relation didn't resolve.
        $missingIds = [];
        foreach ($records as $r) {
            $emp = $r->getRelation('employee');
            if (!$emp || ($emp->first_name ?? null) === '---') {
                $eid = $r->employee_id;
                if ($eid !== null && $eid !== '') {
                    $missingIds[(string) $eid] = true;
                }
            }
        }

        if (!$missingIds) {
            return $records;
        }

        $columns = $employeeColumns ?: [
            'system_user_id', 'employee_id', 'first_name', 'last_name',
            'full_name', 'display_name', 'department_id', 'branch_id',
            'designation_id', 'profile_picture', 'company_id',
        ];

        $map = Employee::where('company_id', $companyId)
            ->whereIn('employee_id', array_keys($missingIds))
            ->with($employeeWith)
            ->get($columns)
            ->keyBy(fn($e) => (string) $e->employee_id);

        if ($map->isEmpty()) {
            return $records;
        }

        foreach ($records as $r) {
            $emp = $r->getRelation('employee');
            if ($emp && ($emp->first_name ?? null) !== '---') {
                continue;
            }
            $real = $map->get((string) $r->employee_id);
            if ($real) {
                $r->setRelation('employee', $real);
            }
        }

        return $records;
    }

    public function employee_report_only()
    {
        return $this->belongsTo(EmployeeReportOnly::class, "employee_id", "system_user_id")->withOut("schedule")->withDefault([
            'first_name' => '---',
            "department" => ["name" => "---"],
        ]);
    }

    public function employeeapi()
    {
        return $this->belongsTo(Employee::class, "employee_id", "system_user_id")->withOut(["schedule", "department", "designation", "sub_department", "branch"]);
    }
    public function employeeAttendance()
    {
        return $this->belongsTo(Employee::class, "employee_id");
    }

    public function getEditDateAttribute()
    {
        return date("Y-m-d", strtotime($this->date));
    }
    public function branch()
    {
        return $this->belongsTo(CompanyBranch::class, "branch_id");
    }
    public function AttendanceLogs()
    {
        return $this->hasMany(AttendanceLog::class, "UserID", "employee_id");
    }

    public function schedule()
    {
        return $this->belongsTo(ScheduleEmployee::class, "employee_id", "employee_id")->withOut(["shift_type"]);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::addGlobalScope('order', function (Builder $builder) {
            //$builder->orderBy('id', 'desc');
        });
    }

    public function last_reason()
    {
        return $this->hasOne(Reason::class, 'reasonable_id', 'id')->latest();
    }

    public function processAttendanceModel($request)
    {

        $company_id = $request->company_id;

        $model = self::query();

        $model->where('company_id', $request->company_id);

        $showTabs = json_decode(request("showTabs") ?? '[]', true);

        $filteredTabs = array_filter($showTabs, fn($value) => $value === true);

        if (count($filteredTabs) > 1) {
            if (($showTabs['multi'] == true || $showTabs['double'] == true) && request("shift_type_id", 0) > 0) {
                $model->where('shift_type_id',  request("shift_type_id"));
            } else {
                $model->whereNotIn('shift_type_id', [2, 5]);
            }
        }

        $model->with(['shift_type', 'last_reason', 'branch']);

        if (!empty($request->employee_id)) {
            $employeeIds = is_array($request->employee_id) ? $request->employee_id : explode(",", $request->employee_id);
            $model->whereIn('employee_id', $employeeIds);
        }
        $department_ids = $request->department_ids;

        if (gettype($department_ids) !== "array") {
            $department_ids = explode(",", $department_ids);
        }

        $model->when($request->filled('department_ids') && count($department_ids) > 0, function ($q) use ($request, $department_ids) {
            $q->whereIn('employee_id', Employee::whereIn("department_id", $department_ids)->where('company_id', $request->company_id)->pluck("system_user_id"));
        });

        $model->when($request->filled('status') && $request->status != "-1", function ($q) use ($request) {
            $q->where('status', $request->status);
        });

        $model->when(count($request->statuses ?? []) > 0, fn($q) => $q->whereIn('status', request("statuses")));

        $model->when($request->status == "ME", function ($q) {
            $q->where('is_manual_entry', true);
        });

        $model->when($request->late_early == "LC", function ($q) {
            $q->where('late_coming', "!=", "---");
        });

        $model->when($request->late_early == "EG", function ($q) {
            $q->where('early_going', "!=", "---");
        });

        $model->when($request->overtime == 1, function ($q) {
            $q->where('ot', "!=", "---");
        });

        $model->when($request->filled('branch_id'), function ($q) use ($request) {
            $key = strtolower($request->branch_id);
            $q->whereHas('employee', fn(Builder $query) => $query->where('branch_id',   $key));
        });

        // Plural branch_ids support (multi-select from frontend)
        $branch_ids = $request->branch_ids;
        if (gettype($branch_ids) !== "array") {
            $branch_ids = $branch_ids ? explode(",", $branch_ids) : [];
        }
        $model->when($request->filled('branch_ids') && count($branch_ids) > 0, function ($q) use ($request, $branch_ids) {
            $q->whereIn('employee_id', Employee::whereIn("branch_id", $branch_ids)
                ->where('company_id', $request->company_id)
                ->pluck("system_user_id"));
        });


        $model->when($request->daily_date && $request->report_type == 'Daily', function ($q) use ($request) {
            $q->whereDate('date', $request->daily_date);
        });

        $model->when($request->from_date && $request->to_date && $request->report_type != 'Daily', function ($q) use ($request) {
            $q->whereBetween("date", [$request->from_date, $request->to_date]);
        });

        // Pre-fetch eligible employee IDs to avoid slow nested whereHas subqueries
        $scheduleQuery = \App\Models\ScheduleEmployee::where('company_id', $company_id);
        $showTabsRaw = json_decode(request("showTabs") ?? '[]', true);
        $filteredTabsCount = count(array_filter($showTabsRaw, fn($value) => $value === true));
        if ($filteredTabsCount > 1) {
            if (($showTabsRaw['multi'] == true || $showTabsRaw['double'] == true) && request("shift_type_id", 0) > 0) {
                $scheduleQuery->where('shift_type_id', request("shift_type_id"));
            } else {
                $scheduleQuery->whereIn('shift_type_id', [1, 3, 4, 6]);
            }
        }
        $scheduledEmployeeIds = $scheduleQuery->pluck('employee_id')->unique();

        // If the caller explicitly picked employee(s), honour that without the schedule gate.
        if (empty($request->employee_id)) {
            $eligibleEmployeeIds = Employee::where('company_id', $company_id)
                ->where('status', 1)
                ->whereIn('system_user_id', $scheduledEmployeeIds)
                ->pluck('system_user_id');

            $model->whereIn('employee_id', $eligibleEmployeeIds);
        }

        $model->with([
            'employee' => function ($q) use ($company_id) {
                $q->where('company_id', $company_id);
                $q->where('status', 1);
                $q->select('system_user_id', 'full_name', 'display_name', "department_id", "designation_id", "first_name", "last_name", "profile_picture", "employee_id", "branch_id", "joining_date");
                $q->with(['department', 'branch', "designation"]);
                $q->with([
                    "schedule"       => function ($q) use ($company_id) {
                        $q->where('company_id', $company_id);
                        $q->select("id", "shift_id", "employee_id");
                        $q->withOut("shift_type");
                    },
                    "schedule.shift" => function ($q) use ($company_id) {
                        $q->where('company_id', $company_id);
                        $q->select("id", "name", "shift_type_id", "working_hours", "on_duty_time", "off_duty_time", "days", "weekend1", "weekend2", "monthly_flexi_holidays", "halfday", "halfday_working_hours");
                    },
                ]);
            },
        ]);

        $model->with('device_in', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
        });

        $model->with('device_out', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
        });

        $model->with('shift', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
        });

        $model->with('schedule', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
        });

        //$model->with('schedule');

        $model->when($request->filled('date'), function ($q) use ($request) {
            $q->whereDate('date', '=', $request->date);
        });

        $model->when($request->filled('sortBy'), function ($q) use ($request) {
            $sortDesc = $request->input('sortDesc');

            $q->orderBy($request->sortBy, $sortDesc == 'true' ? 'desc' : 'asc');
        });

        $model->when(!$request->filled('sortBy'), function ($q) use ($request) {

            if ($request->from_date == $request->to_date) {
                $q->orderBy(Employee::select("first_name")->whereColumn("employees.company_id", "attendances.company_id")->whereColumn("employees.system_user_id", "attendances.employee_id")->limit(0, 1),   'asc');
            } else {
                $q->orderBy('date', 'asc');
            }
        });

        // Pre-fetch access control device IDs to avoid slow whereDoesntHave subqueries
        $accessControlDeviceIds = \App\Models\Device::where('device_type', 'Access Control')->pluck('device_id');
        if ($accessControlDeviceIds->isNotEmpty()) {
            $model->where(function ($q) use ($accessControlDeviceIds) {
                $q->whereNull('device_id_in')->orWhereNotIn('device_id_in', $accessControlDeviceIds);
            });
            $model->where(function ($q) use ($accessControlDeviceIds) {
                $q->whereNull('device_id_out')->orWhereNotIn('device_id_out', $accessControlDeviceIds);
            });
        }

        return $model;
    }
    public function processAttendanceModelPDFJob($request)
    {

        $model = self::query();

        $model->where('company_id', $request->company_id);
        $model->with(['shift_type', 'last_reason', 'branch']);

        $model->when($request->employee_id, function ($q) use ($request) {
            $q->where('employee_id', $request->employee_id);
        });


        $model->when($request->shift_type_id && $request->shift_type_id == 2, function ($q) use ($request) {
            $q->where('shift_type_id', 2);
            // $q->where(function ($query) {
            //     $query->where('shift_type_id',   2)
            //         ->orWhere('shift_type_id', '---');
            // });
        });

        $model->when($request->shift_type_id && $request->shift_type_id == 5, function ($q) {
            $q->where('shift_type_id', 5);
            // $q->where(function ($query) {
            //     $query->where('shift_type_id',   5)
            //         ->orWhere('shift_type_id', '---');
            // });
        });

        $model->when($request->shift_type_id && in_array($request->shift_type_id, [1, 3, 4, 6]), function ($q) {
            //$q->whereIn('shift_type_id', [1, 3, 4, 6]);
            $q->where(function ($query) {
                $query->whereIn('shift_type_id', [1, 3, 4, 6])
                    ->orWhere('shift_type_id', '---');
            });
        });

        $department_ids = $request->department_ids;

        if (gettype($department_ids) !== "array") {
            $department_ids = explode(",", $department_ids);
        }

        $model->when($request->department_ids && count($department_ids) > 0, function ($q) use ($request, $department_ids) {
            $q->whereIn('employee_id', Employee::whereIn("department_id", $department_ids)->where('company_id', $request->company_id)->pluck("system_user_id"));
        });

        $model->when($request->status && $request->status != "-1", function ($q) use ($request) {
            $q->where('status', $request->status);
        });


        $model->when($request->status == "ME", function ($q) {
            $q->where('is_manual_entry', true);
        });

        $model->when($request->late_early == "LC", function ($q) {
            $q->where('late_coming', "!=", "---");
        });

        $model->when($request->late_early == "EG", function ($q) {
            $q->where('early_going', "!=", "---");
        });

        $model->when($request->overtime == 1, function ($q) {
            $q->where('ot', "!=", "---");
        });

        $model->when($request->branch_id, function ($q) use ($request) {
            $key = strtolower($request->branch_id);
            $q->whereHas('employee', fn(Builder $query) => $query->where('branch_id',   $key));
        });
        // $model->when($request->filled('branch_id'), function ($q) use ($request) {
        //     $q->where('branch_id',   $request->branch_id);
        // });


        $model->when($request->daily_date && $request->report_type == 'Daily', function ($q) use ($request) {
            $q->whereDate('date', $request->daily_date);
        });

        $model->when($request->from_date && $request->to_date && $request->report_type != 'Daily', function ($q) use ($request) {
            $q->whereBetween("date", [$request->from_date, $request->to_date]);
        });

        // $model->whereBetween("date", [$request->from_date, $request->to_date]);

        $model->whereHas('employee', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
            $q->where('status', 1);
            $q->select('system_user_id', 'display_name', "department_id", "first_name", "last_name", "profile_picture", "employee_id", "branch_id");
            $q->with(['department', 'branch']);
        });

        $model->with([
            'employee' => function ($q) use ($request) {
                $q->where('company_id', $request->company_id);
                $q->where('status', 1);
                $q->select('system_user_id', 'full_name', 'display_name', "department_id", "first_name", "last_name", "profile_picture", "employee_id", "branch_id");
                $q->with(['department', 'branch']);
            }
        ]);

        $model->with('device_in', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
        });

        $model->with('device_out', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
        });

        $model->with('shift', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
        });

        $model->with('schedule', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
        });

        //$model->with('schedule');

        $model->when($request->date, function ($q) use ($request) {
            $q->whereDate('date', '=', $request->date);
        });

        $model->when($request->sortBy, function ($q) use ($request) {
            $sortDesc = $request->sortDesc;

            $q->orderBy($request->sortBy, $sortDesc == 'true' ? 'desc' : 'asc');
        });

        $model->when(!$request->sortBy, function ($q) use ($request) {

            if ($request->from_date == $request->to_date) {
                $q->orderBy(Employee::select("first_name")->whereColumn("employees.company_id", "attendances.company_id")->whereColumn("employees.system_user_id", "attendances.employee_id")->limit(0, 1),   'asc');
            } else {
                $q->orderBy('date', 'asc');
            }
        });

        $model->whereDoesntHave('device_in', fn($q) => $q->where('device_type', 'Access Control'));
        $model->whereDoesntHave('device_out', fn($q) => $q->where('device_type', 'Access Control'));



        return $model;
    }


    public function startDBOperation($date, $script, $payload)
    {
        if (!count($payload)) {
            return "($script Shift) {$date->format('d-M-y')}: No Data Found";
        }

        $employee_ids = array_column($payload, "employee_id");
        $company_ids = array_column($payload, "company_id");

        try {
            $model = self::query();
            $model->where("date", $date->format('Y-m-d'));
            $model->whereIn("employee_id", $employee_ids);
            $model->whereIn("company_id", $company_ids);
            $model->delete();
            $model->insert($payload);
            AttendanceLog::whereIn("UserID", $employee_ids)->whereIn("company_id", $company_ids)->update(["checked" => true]);
            return "($script Shift) " . $date->format('d-M-y') . ": Log(s) has been render. Affected Ids: " . json_encode($employee_ids) . " Affected Company_id Ids: " . json_encode($company_ids);
        } catch (\Throwable $e) {
            return $e->getMessage();
        }
    }



    public static function processWeekOffFunc($currentDayKey, $weekoff_rules, $company_id, $date, $employeeId, $firstLog)
    {
        // Normalise: DB column may arrive as JSON string, array, or null.
        if (is_string($weekoff_rules)) {
            $decoded = json_decode($weekoff_rules, true);
            $weekoff_rules = is_array($decoded) ? $decoded : null;
        } elseif (!is_array($weekoff_rules)) {
            $weekoff_rules = null;
        }

        $shift = (object) ['weekoff_rules' => $weekoff_rules];

        return AttendanceWeekOffService::calculateStatus(
            $currentDayKey,
            $weekoff_rules,
            $shift,
            (int) $company_id,
            $date,
            (int) $employeeId,
            $firstLog
        );
    }

    public static function processHalfDay($currentDayKey, $halfday_rules, $shift)
    {
        // Check Half Day Rules (If not a week off)
        if (($halfday_rules['enabled'] ?? false) && $halfday_rules['day'] === $currentDayKey) {
            $fieldMap = [
                'on_duty_time'  => 'onDuty',
                'off_duty_time' => 'offDuty',
                'working_hours' => 'minHours',
                'beginning_in'  => 'beginStart',
                'beginning_out' => 'beginEnd',
                'ending_in'     => 'endStart',
                'ending_out'    => 'endEnd',
            ];
            foreach ($fieldMap as $shiftKey => $ruleKey) {
                $shift[$shiftKey] = $halfday_rules[$ruleKey] ?? $shift[$shiftKey];
            }
        }

        return $shift;
    }
}
