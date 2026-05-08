<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Company;
use App\Models\Department;
use App\Models\Device;
use App\Models\Employee;
use App\Models\Theme;
use DateTime;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ThemeController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        // return Theme::truncate();
        // return Theme::count();

        $id = $request->company_id;

        $counts = $this->getCounts($request->company_id ?? 8, $request);

        $jsonColumn = Theme::where("company_id", $id)
            ->where("page", $request->page)
            ->where("type", $request->type)
            ->value("style") ?? [];

        foreach ($jsonColumn as &$card) {
            $card["calculated_value"] = str_pad($counts[$card["value"]] ?? "", 2, '0', STR_PAD_LEFT);
        }
        return $jsonColumn;
    }

    public function whatsappTodayStats(Request $request)
    {
        $data = $this->getCounts($request->company_id, $request);

        $company = Company::with(["contact"])->where("id", $request->company_id)->first();

        if ($company && $company->enable_desktop_whatsapp == true) {
            $message = "🌟 Summary Notification 🌟  \n";

            $message .= "" . $company["name"] . "\n";
            $message .= "Date: " . date("H:i, d,M Y") . "\n";
            $message .= "Total Employees: " . $data["employeeCount"] . "\n";
            $message .= "Total Present: " . $data["missingCount"] + $data["presentCount"] . "\n";
            $message .= "Inside: " . $data["missingCount"] . "\n";
            $message .= "Logout: " . $data["presentCount"] . "\n";
            (new WhatsappNotificationsLogController())->addMessage($request->company_id, $company->contact->whatsapp, $message);

            // WhatsappNotificationsLog::create(["company_id" =>  $request->company_id,  "whatsapp_number" => $company->contact->whatsapp, "message" => $message]);
            return $this->response("Whatsapp Request Created Successfully", null, true);
        } else {
            return $this->response("Desktop Whatsapp is not active", null, true);
        }
    }
    public function dashboardCount(Request $request)
    {
        return $this->getDashboardCounts($request->company_id, $request);
    }

    public function dashboardShortViewCount(Request $request)
    {

        $companyId = $request->input('company_id', 0);
        $branch_id = $request->input('branch_id', 0);

        $model = Attendance::where('company_id', $companyId)
            ->whereHas('employee', fn(Builder $query) => $query->where('company_id', $companyId))

            ->when($request->filled("branch_ids"), function ($q) use ($request) {
                $q->whereHas("employee", fn($q) => $q->whereIn("branch_id", $request->branch_ids));
            })
            ->when($request->filled("department_ids"), function ($q) use ($request) {
                $q->whereHas("employee", fn($q) => $q->whereIn("department_id", $request->department_ids));
            })

            ->when($branch_id, function ($q) use ($branch_id) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('branch_id', $branch_id));
            })
            ->when($request->filled("department_id") && $request->department_id > 0, function ($q) use ($request) {
                $q->where("department_id", $request->department_id);
            })
            // ->whereHas("schedule", fn($q) => $q->where("company_id", $companyId))
            ->whereDate('date', date('Y-m-d'))
            ->select(
                DB::raw("COUNT(CASE WHEN status in ('P','M','LC','EG') THEN 1 END) AS clockedin"),
                DB::raw("COUNT(CASE WHEN status in ('P','EG') THEN 1 END) AS clockedout"),
                DB::raw("COUNT(CASE WHEN status in ('M','LC') THEN 1 END) AS inside"),
                DB::raw("COUNT(CASE WHEN status = 'A' THEN 1 END) AS noshow"),
            )->first();

        //  #bd2e4a Clock In
        // #005edf Clock Out
        // #38336b Inside
        // #35b568 No Show

        return [
            [
                'bgColor' => '#bd2e4a',
                'color'   => '#bd2e4a',
                'icon'    => '1.png',
                'value'   => $model->clockedin,
                'text'    => 'Clocked In',
            ],
            [
                'bgColor' => '#005edf',
                'color'   => '#005edf',
                'icon'    => '2.png',
                'value'   => $model->clockedout,
                'text'    => 'Clocked Out',
            ],
            [
                'bgColor' => '#38336b',
                'color'   => '#38336b',
                'icon'    => '3.png',
                'value'   => $model->inside,
                'text'    => 'Inside',
            ],
            [
                'bgColor' => '#35b568',
                'color'   => '#35b568',
                'icon'    => '4.png',
                'value'   => $model->noshow,
                'text'    => 'No Show',
            ],
        ];
    }

    public function getAdditionalCount(Request $request)
    {
        $companyId = $request->input('company_id', 0);
        $branch_id = $request->input('branch_id', 0);

        return Attendance::where('company_id', $companyId)
            ->whereHas('employee', fn(Builder $query) => $query->where('company_id', $companyId))

            ->when($branch_id, function ($q) use ($branch_id) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('branch_id', $branch_id));
            })
            ->when($request->filled("department_id") && $request->department_id > 0, function ($q) use ($request) {
                $q->where("department_id", $request->department_id);
            })
            // ->whereHas("schedule", fn($q) => $q->where("company_id", $companyId))
            ->whereDate('date', date('Y-m-d'))
            ->select(
                DB::raw("COUNT(CASE WHEN status in ('P','M','LC','EG') THEN 1 END) AS clockedin"),
                DB::raw("COUNT(CASE WHEN status in ('P','EG') THEN 1 END) AS clockedout"),
                DB::raw("COUNT(CASE WHEN status in ('M','LC') THEN 1 END) AS inside"),
                DB::raw("COUNT(CASE WHEN status = 'A' THEN 1 END) AS noshow"),
            )->first();
    }

    public function getCounts($companyId = 0, $request)
    {
        $branch_id = $request->input('branch_id', 0);

        $department_id = $request->input('department_id', 0);

        $model = Attendance::where('company_id', $companyId)
            ->when($request->filled("branch_ids"), function ($q) use ($request) {
                $q->whereHas("employee", fn($q) => $q->whereIn("branch_id", $request->branch_ids));
            })
            ->when($request->filled("department_ids"), function ($q) use ($request) {
                $q->whereHas("employee", fn($q) => $q->whereIn("department_id", $request->department_ids));
            })

            ->when($branch_id, function ($q) use ($branch_id) {
                $q->whereHas('employee', fn(Builder $q) => $q->where('branch_id', $branch_id));
            })->when($department_id, function ($q) use ($department_id) {
                $q->whereHas('employee', fn(Builder $q) => $q->where('department_id', $department_id));
            })
            ->whereHas("schedule", fn($q) => $q->where("company_id", $companyId))
            ->whereIn('status', ['P', 'A', 'M', 'O', 'H', 'L', 'V', 'LC', 'EG'])
            ->whereDate('date', date("Y-m-d"))
            ->select('status')
            ->get();

        $presentCount = $model->whereIn('status', ['P', 'M', 'LC', 'EG'])->count();

        $employeeCount = Employee::where("company_id", $companyId)
            ->when($branch_id, fn($q) => $q->where("branch_id", $branch_id))
            ->when($department_id, fn($q) => $q->where("department_id", $department_id))
            ->when($request->filled("branch_ids"), function ($q) use ($request) {
                $q->whereIn("branch_id", $request->branch_ids);
            })
            ->when($request->filled("department_ids"), function ($q) use ($request) {
                $q->whereIn("department_id", $request->department_ids);
            })
            ->count() ?? 0;

        $leaveCount = $model->where('status', 'L')->count();

        $vaccationCount = $model->where('status', 'V')->count();

        $offlineDevices = Device::where('company_id', $companyId)
            ->when($branch_id, function ($q) use ($branch_id) {
                $q->whereHas('branch', fn(Builder $q) => $q->where('branch_id', $branch_id));
            })
            ->when($request->filled("branch_ids"), function ($q) use ($request) {
                $q->whereIn("branch_id", $request->branch_ids);
            })
            ->where('status_id', 2)
            ->where('device_id', "!=", "Manual")
            ->where('device_type', "!=", "Mobile")
            ->where(function ($q) {
                $q->whereNull('model_number')->orWhere('model_number', 'not like', '%Mobile%');
            })
            ->count();

        return [
            "employeeCount"  => $employeeCount,
            "presentCount"   => $presentCount,
            "absentCount"    => $employeeCount - ($presentCount + $leaveCount + $vaccationCount),
            "leaveCount"     => $leaveCount,
            "vaccationCount" => $vaccationCount,
            "additional"     => $this->getAdditionalCount($request),
            "offlineDevices" => $offlineDevices,
        ];
    }

    /**
     * Dashboard-only counts: "Present" means anyone with at least one attendance
     * log today (any device). Used by the dashboard cards via dashboardCount().
     * Other callers (Theme cards, WhatsApp stats, etc.) keep using getCounts().
     */
    public function getDashboardCounts($companyId = 0, $request)
    {
        $branch_id = $request->input('branch_id', 0);
        $department_id = $request->input('department_id', 0);

        $employeeCount = Employee::where("company_id", $companyId)
            ->when($branch_id, fn($q) => $q->where("branch_id", $branch_id))
            ->when($department_id, fn($q) => $q->where("department_id", $department_id))
            ->when($request->filled("branch_ids"), function ($q) use ($request) {
                $q->whereIn("branch_id", $request->branch_ids);
            })
            ->when($request->filled("department_ids"), function ($q) use ($request) {
                $q->whereIn("department_id", $request->department_ids);
            })
            ->count() ?? 0;

        // Present Today = unique employees who logged at least once today (any device)
        $presentCount = AttendanceLog::where('company_id', $companyId)
            ->whereDate('LogTime', date('Y-m-d'))
            ->whereHas('employee', function ($q) use ($branch_id, $department_id, $request) {
                $q->where('company_id', $request->company_id);
                if ($branch_id) $q->where('branch_id', $branch_id);
                if ($department_id) $q->where('department_id', $department_id);
                if ($request->filled('branch_ids')) $q->whereIn('branch_id', $request->branch_ids);
                if ($request->filled('department_ids')) $q->whereIn('department_id', $request->department_ids);
            })
            ->distinct('UserID')
            ->count('UserID');

        // Leave/Vacation/Offline counts come from the existing Attendance/Device tables
        $attendances = Attendance::where('company_id', $companyId)
            ->when($branch_id, function ($q) use ($branch_id) {
                $q->whereHas('employee', fn(Builder $q) => $q->where('branch_id', $branch_id));
            })
            ->when($department_id, function ($q) use ($department_id) {
                $q->whereHas('employee', fn(Builder $q) => $q->where('department_id', $department_id));
            })
            ->when($request->filled("branch_ids"), function ($q) use ($request) {
                $q->whereHas("employee", fn($q) => $q->whereIn("branch_id", $request->branch_ids));
            })
            ->when($request->filled("department_ids"), function ($q) use ($request) {
                $q->whereHas("employee", fn($q) => $q->whereIn("department_id", $request->department_ids));
            })
            ->whereDate('date', date("Y-m-d"))
            ->select('status')
            ->get();

        $leaveCount = $attendances->where('status', 'L')->count();
        $vaccationCount = $attendances->where('status', 'V')->count();

        $offlineDevices = Device::where('company_id', $companyId)
            ->when($branch_id, function ($q) use ($branch_id) {
                $q->whereHas('branch', fn(Builder $q) => $q->where('branch_id', $branch_id));
            })
            ->when($request->filled("branch_ids"), function ($q) use ($request) {
                $q->whereIn("branch_id", $request->branch_ids);
            })
            ->where('status_id', 2)
            ->where('device_id', "!=", "Manual")
            ->where('device_type', "!=", "Mobile")
            ->where(function ($q) {
                $q->whereNull('model_number')->orWhere('model_number', 'not like', '%Mobile%');
            })
            ->count();

        return [
            "employeeCount"  => $employeeCount,
            "presentCount"   => $presentCount,
            "absentCount"    => max(0, $employeeCount - ($presentCount + $leaveCount + $vaccationCount)),
            "leaveCount"     => $leaveCount,
            "vacationCount"  => $vaccationCount,
            "vaccationCount" => $vaccationCount, // legacy key
            "additional"     => $this->getAdditionalCount($request),
            "offlineDevices" => $offlineDevices,
        ];
    }
    public function dashboardGetCountDepartment(Request $request)
    {
        $model = Attendance::with(['employee:id,employee_id,status,system_user_id,department_id'])->where('company_id', $request->company_id)
            ->whereIn('status', ['P', 'A', 'M', 'O', 'H', 'L', 'V'])
            ->whereDate('date', date('Y-m-d'))
            ->when($request->filled("branch_id"), function ($q) use ($request) {
                $q->whereHas("employee", fn($q) => $q->where("branch_id", $request->branch_id));
            })
            ->when($request->filled("department_id") && $request->department_id > 0, function ($q) use ($request) {
                $q->whereHas("employee", fn($q) => $q->where("department_id", $request->department_id));
            })
            ->get();

        $departments = Department::query();

        $departments->when($request->filled("department_id") && $request->department_id > 0, function ($q) use ($request) {
            $q->where("id", $request->department_id);
        });

        $data = $departments->where('company_id', $request->company_id)->orderBy("name", "asc")->get();

        $return = [];
        foreach ($data as $department) {

            $return[$department->name] = [

                "presentCount"   => $model->where('status', 'P')->where('employee.department_id', $department->id)->count(),
                "absentCount"    => $model->where('status', 'A')->where('employee.department_id', $department->id)->count(),
                "missingCount"   => $model->where('status', 'M')->where('employee.department_id', $department->id)->count(),
                "offCount"       => $model->where('status', 'O')->where('employee.department_id', $department->id)->count(),
                "holidayCount"   => $model->where('status', 'H')->where('employee.department_id', $department->id)->count(),
                "leaveCount"     => $model->where('status', 'L')->where('employee.department_id', $department->id)->count(),
                "vaccationCount" => $model->where('status', 'V')->where('employee.department_id', $department->id)->count(),
            ];
        }

        return $return;
    }
    public function previousWeekAttendanceCount(Request $request, $id)
    {
        $dates = [];

        for ($i = 13; $i >= 7; $i--) {
            $date    = date('Y-m-d', strtotime(date('Y-m-d') . '-' . $i . ' days'));
            $dates[] = $date;
        }

        $date  = date('Y-m-d', strtotime(date('Y-m-d') . '-' . $i . ' days'));
        $model = Attendance::with("employee")->where('company_id', $id)
            ->whereIn('status', ['P', 'A', 'M', 'O', 'H', 'L', 'V'])
            ->whereIn('date', $dates)
            ->when($request->filled("branch_id"), function ($q) use ($request) {
                $q->whereHas("employee", fn($q) => $q->where("branch_id", $request->branch_id));
            })
            ->select('status')
            ->get();

        return [
            "date"           => $date,
            "presentCount"   => $model->where('status', 'P')->count(),
            "absentCount"    => $model->where('status', 'A')->count(),
            "missingCount"   => $model->where('status', 'M')->count(),
            "offCount"       => $model->where('status', 'O')->count(),
            "holidayCount"   => $model->where('status', 'H')->count(),
            "leaveCount"     => $model->where('status', 'L')->count(),
            "vaccationCount" => $model->where('status', 'V')->count(),
        ];
    }
    public function dashboardGetCountslast7Days(Request $request)
    {
        $cacheKey = "attendance_dashboard_counts_" . md5(json_encode($request->all()));

        // Attempt to retrieve the result from the cache
        $finalarray = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($request) {
            $finalarray  = [];
            $dateStrings = [];

            if ($request->has("date_from") && $request->has("date_to")) {
                $startDate = new DateTime($request->date_from);
                $endDate   = new DateTime($request->date_to);

                $dateStrings = $this->createDateRangeArray($startDate, $endDate);
            } else {
                for ($i = 6; $i >= 0; $i--) {
                    $dateStrings[] = date('Y-m-d', strtotime(date('Y-m-d') . '-' . $i . ' days'));
                }
            }

            foreach ($dateStrings as $key => $value) {
                $date = $value;

                $model = Attendance::with("employee")
                    ->where('company_id', $request->company_id)
                    ->whereIn('status', ['P', 'A', 'M', 'O', 'H', 'L', 'V'])
                    ->whereDate('date', $date)
                    ->when($request->filled("branch_ids"), function ($q) use ($request) {
                        $q->whereHas("employee", fn($q) => $q->whereIn("branch_id", $request->branch_ids));
                    })
                    ->when($request->filled("department_ids"), function ($q) use ($request) {
                        $q->whereHas("employee", fn($q) => $q->whereIn("department_id", $request->department_ids));
                    })
                    ->when($request->filled("branch_id"), function ($q) use ($request) {
                        $q->whereHas("employee", fn($q) => $q->where("branch_id", $request->branch_id));
                    })
                    ->when($request->filled("department_id") && $request->department_id > 0, function ($q) use ($request) {
                        $q->whereHas("employee", fn($q) => $q->where("department_id", $request->department_id));
                    })
                    ->when($request->filled("system_user_id"), function ($q) use ($request) {
                        $q->where("employee_id", $request->system_user_id);
                    })
                    ->select('status')
                    ->get();

                $finalarray[] = [
                    "date"           => $date,
                    "presentCount"   => $model->where('status', 'P')->count(),
                    "absentCount"    => $model->where('status', 'A')->count(),
                    "missingCount"   => $model->where('status', 'M')->count(),
                    "offCount"       => $model->where('status', 'O')->count(),
                    "holidayCount"   => $model->where('status', 'H')->count(),
                    "leaveCount"     => $model->where('status', 'L')->count(),
                    "vaccationCount" => $model->where('status', 'V')->count(),
                ];
            }

            return $finalarray;
        });

        return $finalarray;
    }

    public function dashboardGetCountslast7DaysChart(Request $request)
    {
        $colors = [
            "#14b8a6",
            "#06b6d4",
            "#10b981",
            "#6366f1",
            "#a855f7",
            "#f59e0b",
            "#ef4444",
        ];

        $rows = $this->dashboardGetCountslast7Days($request);

        $data = [];
        foreach ($rows as $index => $row) {
            $dayLetter = substr((new DateTime($row["date"]))->format("D"), 0, 1);

            $data[] = [
                "day"   => $dayLetter,
                "value" => (int) ($row["presentCount"] == 0 ? 100 : $row["presentCount"]),
                "fill"  => $colors[$index % count($colors)],
            ];
        }

        return $data;
    }

    public function createDateRangeArray($startDate, $endDate)
    {
        $dateStrings = [];
        $currentDate = $startDate;

        while ($currentDate <= $endDate) {
            $dateStrings[] = $currentDate->format('Y-m-d'); // Change the format as needed
            $currentDate->modify('+1 day');
        }

        return $dateStrings;
    }

    public function dashboardGetCountsTodayHourInOut(Request $request)
    {

        $finalarray = [];

        for ($i = 0; $i < 24; $i++) {

            $j = $i;

            $j = $i <= 9 ? "0" . $i : $i;

            $date  = date('Y-m-d'); //, strtotime(date('Y-m-d') . '-' . $i . ' days'));
            $model = AttendanceLog::with(["employee"])->where('company_id', $request->company_id)
                ->when($request->filled("branch_id"), function ($q) use ($request) {
                    $q->whereHas("employee", fn($q) => $q->where("branch_id", $request->branch_id));
                })
                ->when($request->filled("department_id") && $request->department_id > 0, function ($q) use ($request) {
                    $q->whereHas("employee", fn($q) => $q->where("department_id", $request->department_id));
                })
                // ->whereDate('LogTime', $date)

                ->where('LogTime', '>=', $date . ' ' . $j . ':00:00')
                ->where('LogTime', '<', $date . ' ' . $j . ':59:59')
                ->get();

            $finalarray[] = [
                "date"  => $date,
                "hour"  => $i,
                "count" => $model->count(),

            ];
        }

        return $finalarray;
    }

    public function dashboardGetVisitorCountsTodayHourInOut(Request $request)
    {

        $finalarray = [];

        for ($i = 0; $i < 24; $i++) {

            $j = $i;

            $j = $i <= 9 ? "0" . $i : $i;

            $date  = date('Y-m-d'); //, strtotime(date('Y-m-d') . '-' . $i . ' days'));
            $model = AttendanceLog::with(["visitor"])->where('company_id', $request->company_id)

                ->whereIn('UserID', function ($query) use ($request) {
                    $query->select('system_user_id')
                        ->where('visit_from', "<=", date('Y-m-d'))
                        ->where('visit_to', ">=", date('Y-m-d'))
                        ->when($request->filled("branch_id"), function ($query) use ($request) {
                            return $query->where('branch_id', $request->branch_id);
                        })
                        ->from('visitors');
                })
                // ->when($request->filled("branch_id"), function ($q) use ($request) {
                //     $q->whereHas("visitor", fn ($q) => $q->where("branch_id", $request->branch_id));
                // })
                // ->whereDate('LogTime', $date)

                ->where('LogTime', '>=', $date . ' ' . $j . ':00:00')
                ->where('LogTime', '<', $date . ' ' . $j . ':59:59')
                ->get();

            $finalarray[] = [
                "date"  => $date,
                "hour"  => $i,
                "count" => $model->count(),

            ];
        }

        return $finalarray;
    }

    public function dashboardGetCountsTodayMultiGeneral(Request $request)
    {

        $finalarray = []; {

            $model = Attendance::with("employee")->where('company_id', $request->company_id)
                ->whereIn('status', ['P', 'A', 'M', 'O', 'H', 'L', 'V'])
                ->whereDate('date', date('Y-m-d'))
                ->when($request->filled("branch_id"), function ($q) use ($request) {
                    $q->whereHas("employee", fn($q) => $q->where("branch_id", $request->branch_id));
                })
                ->select('status')
                ->get();

            $finalarray['multi'] = [
                "date"           => date('Y-m-d'),
                "presentCount"   => $model->where('status', 'P')->where('shift_type_id', 2)->count(),
                "absentCount"    => $model->where('status', 'A')->where('shift_type_id', 2)->count(),
                "missingCount"   => $model->where('status', 'M')->where('shift_type_id', 2)->count(),
                "offCount"       => $model->where('status', 'O')->where('shift_type_id', 2)->count(),
                "holidayCount"   => $model->where('status', 'H')->where('shift_type_id', 2)->count(),
                "leaveCount"     => $model->where('status', 'L')->where('shift_type_id', 2)->count(),
                "vaccationCount" => $model->where('status', 'V')->where('shift_type_id', 2)->count(),
            ];

            $finalarray['general'] = [
                "date"           => date('Y-m-d'),
                "presentCount"   => $model->where('status', 'P')->where('shift_type_id', '!=', 2)->count(),
                "absentCount"    => $model->where('status', 'A')->where('shift_type_id', '!=', 2)->count(),
                "missingCount"   => $model->where('status', 'M')->where('shift_type_id', '!=', 2)->count(),
                "offCount"       => $model->where('status', 'O')->where('shift_type_id', '!=', 2)->count(),
                "holidayCount"   => $model->where('status', 'H')->where('shift_type_id', '!=', 2)->count(),
                "leaveCount"     => $model->where('status', 'L')->where('shift_type_id', '!=', 2)->count(),
                "vaccationCount" => $model->where('status', 'V')->where('shift_type_id', '!=', 2)->count(),
            ];
        }

        return $finalarray;
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        Theme::where("company_id", $request->company_id)->where("page", $request->page)->where("type", $request->type)->delete();

        return Theme::create([
            "page"       => $request->page,
            "type"       => $request->type,
            "style"      => $request->style,
            "company_id" => $request->company_id,
        ]);
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Theme  $theme
     * @return \Illuminate\Http\Response
     */
    public function theme_count(Request $request)
    {
        return $counts = $this->getCounts(0, $request->company_id);
        return str_pad($counts[$request->value] ?? "", 2, '0', STR_PAD_LEFT);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Theme  $theme
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Theme $theme)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Theme  $theme
     * @return \Illuminate\Http\Response
     */
    public function destroy(Theme $theme)
    {
        //
    }
}
