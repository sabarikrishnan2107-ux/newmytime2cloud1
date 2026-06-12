<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateAttendanceReportPDF;
use App\Models\Attendance;
use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeeLeaves;
use App\Models\Payroll;
use Carbon\Carbon;
use DateTime;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        //    return $request->all();
        $model = (new Attendance)->processAttendanceModel($request);

        if ($request->shift_type_id == 1) {
            return $this->general($model, $request->per_page ?? 1000);
        }

        return $this->multiInOut($model->get(), $request->per_page ?? 1000);
    }

    public function fetchDataOLD(Request $request)
    {
        //    return $request->all();
        $model = (new Attendance)->processAttendanceModel($request);

        if ($request->shift_type_id == 1) {
            return $this->general($model, $request->per_page ?? 1000);
        }

        return $this->multiInOut($model->get(), $request->per_page ?? 1000);
    }

    public function fetchDataNEW(Request $request)
    {
        $perPage = $request->per_page ?? 100;

        $model = (new Attendance)->processAttendanceModel($request);

        $data = $model->paginate($perPage);

        // Weekoff is now computed and persisted by RenderWeekOffJob (daily cron + manual runs).
        // The DB is the single source of truth — no in-memory override needed.

        // Repair employee relations for legacy rows where attendances.employee_id holds
        // the badge value instead of system_user_id. Without this they render as '---'.
        Attendance::rehydrateEmployeesByBadge($data->items(), (int) $request->company_id);

        // Resolve the specific leave-type name (Annual Leave, Sick Leave, …) for any
        // day stamped as leave/vacation, looked up live from the approved request.
        $this->attachLeaveTypeNames($data->items());

        $showTabs = json_decode($request->showTabs, true) ?: [];

        // only for multi in/out
        if (($showTabs['multi'] ?? false) || ($showTabs['double'] ?? false)) {
            foreach ($data as $value) {

                $logs = $value->logs ?? [];

                $logs = array_pad($logs, 7, [
                    "in"         => "---",
                    "out"        => "---",
                    "device_in"  => "---",
                    "device_out" => "---",
                ]);

                // Populate log details for each entry
                foreach ($logs as $index => $log) {
                    $value["in" . ($index + 1)]         = $log["in"];
                    $value["out" . ($index + 1)]        = $log["out"];
                    $value["device_in" . ($index + 1)]  = $log["device_in"];
                    $value["device_out" . ($index + 1)] = $log["device_out"];
                }
            }
        }

        return $data;
    }

    /**
     * For rows stamped as leave (L) or vacation (V), attach the specific leave-type
     * name from the matching approved leave request so the report can show e.g.
     * "Annual Leave" / "Sick Leave" instead of a generic "LEAVE".
     */
    private function attachLeaveTypeNames($items): void
    {
        $items = is_array($items) ? $items : collect($items)->all();

        $leaveRows = array_filter($items, fn($r) => in_array($r->status ?? null, ['L', 'V'], true));
        if (!$leaveRows) {
            return;
        }

        $empIds = [];
        $dates  = [];
        foreach ($leaveRows as $r) {
            if ($eid = ($r->employee->id ?? null)) {
                $empIds[] = $eid;
            }
            if ($d = $this->rowDateString($r)) {
                $dates[] = $d;
            }
        }
        $empIds = array_values(array_unique(array_filter($empIds)));
        $dates  = array_values(array_filter($dates));
        if (!$empIds || !$dates) {
            return;
        }

        $leaves = EmployeeLeaves::with('leave_type')
            ->where('status', 1)
            ->whereIn('employee_id', $empIds)
            ->where('start_date', '<=', max($dates))
            ->where('end_date', '>=', min($dates))
            ->get(['id', 'employee_id', 'start_date', 'end_date', 'leave_type_id']);

        foreach ($items as $r) {
            if (!in_array($r->status ?? null, ['L', 'V'], true)) {
                continue;
            }

            $eid  = $r->employee->id ?? null;
            $d    = $this->rowDateString($r);
            $name = null;

            if ($eid && $d) {
                foreach ($leaves as $lv) {
                    if ((int) $lv->employee_id === (int) $eid
                        && $d >= Carbon::parse($lv->start_date)->format('Y-m-d')
                        && $d <= Carbon::parse($lv->end_date)->format('Y-m-d')
                    ) {
                        $name = $lv->leave_type->name ?? null;
                        break;
                    }
                }
            }

            // Keep the column meaningful even if the source request was edited/removed.
            $r->leave_type_name = ($name && $name !== '---')
                ? $name
                : ($r->status === 'V' ? 'Vacation' : 'Leave');
        }
    }

    private function rowDateString($r): ?string
    {
        $d = $r->date ?? null;
        if (!$d) {
            return null;
        }
        return $d instanceof Carbon ? $d->format('Y-m-d') : Carbon::parse($d)->format('Y-m-d');
    }

    public function general($model, $per_page = 100)
    {
        return $model->paginate($per_page);
    }

    public function multiInOut($model, $per_page = 100)
    {
        foreach ($model as $value) {
            $logs         = $value->logs ?? [];
            $count        = count($logs);
            $requiredLogs = max($count, 7); // Ensure at least 8 logs

            for ($a = 0; $a < $requiredLogs; $a++) {
                $log                                 = $logs[$a] ?? [];
                $value["in" . ($a + 1)]              = $log["in"] ?? "---";
                $value["out" . ($a + 1)]             = $log["out"] ?? "---";
                $value["device_" . "in" . ($a + 1)]  = $log["device_in"] ?? "---";
                $value["device_" . "out" . ($a + 1)] = $log["device_out"] ?? "---";
            }
        }

        return $this->paginate($model, $per_page);
    }

    public function paginate($items, $perPage = 15, $page = null, $options = [])
    {
        $page  = $page ?: (Paginator::resolveCurrentPage() ?: 1);
        $items = $items instanceof Collection ? $items : Collection::make($items);

        $perPage == 0 ? 50 : $perPage;

        $resultArray = [];

        foreach ($items->forPage($page, $perPage) as $object) {
            $resultArray[] = $object;
        }

        return new LengthAwarePaginator($resultArray, $items->count(), $perPage, $page, $options);
        //return new LengthAwarePaginator($items->forPage($page, $perPage), $items->count(), $perPage, $page, $options);
    }

    public function general_download_csv(Request $request)
    {
        $data = (new Attendance)->processAttendanceModel($request)->get();

        $fileName = 'report.csv';

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0",
        ];

        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');

            $i = 0;

            fputcsv($file, ["#", "Date", "E.ID", "Name", "Dept", "Shift Type", "Shift", "Status", "In", "Out", "Total Hrs", "OT", "Late coming", "Early Going", "D.In", "D.Out"]);
            foreach ($data as $col) {
                fputcsv($file, [
                    ++$i,
                    $col['date'],
                    $col['employee_id'] ?? "---",
                    $col['employee']["display_name"] ?? "---",
                    $col['employee']["department"]["name"] ?? "---",
                    $col["shift_type"]["name"] ?? "---",
                    $col["shift"]["name"] ?? "---",
                    $col["status"] ?? "---",
                    $col["in"] ?? "---",
                    $col["out"] ?? "---",
                    $col["total_hrs"] ?? "---",
                    $col["ot"] ?? "---",
                    $col["late_coming"] ?? "---",
                    $col["early_going"] ?? "---",
                    $col["device_in"]["short_name"] ?? "---",
                    $col["device_out"]["short_name"] ?? "---",
                ], ",");
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function multi_in_out_daily_download_csv(Request $request)
    {
        $data = (new Attendance)->processAttendanceModel($request)->get();

        foreach ($data as $value) {
            $count = count($value->logs ?? []);
            if ($count > 0) {
                if ($count < 8) {
                    $diff  = 7 - $count;
                    $count = $count + $diff;
                }
                $i = 1;
                for ($a = 0; $a < $count; $a++) {

                    $holder     = $a;
                    $holder_key = ++$holder;

                    $value["in" . $holder_key]  = $value->logs[$a]["in"] ?? "---";
                    $value["out" . $holder_key] = $value->logs[$a]["out"] ?? "---";
                }
            }
        }

        $fileName = 'report.csv';

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0",
        ];

        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');
            $i    = 0;
            fputcsv($file, [
                "#",
                "Date",
                "E.ID",
                "Name",
                "In1",
                "Out1",
                "In2",
                "Out2",
                "In3",
                "Out3",
                "In4",
                "Out4",
                "In5",
                "Out5",
                "In6",
                "Out6",
                "In7",
                "Out7",
                "Total Hrs",
                "OT",
                "Status",

            ]);
            foreach ($data as $col) {
                fputcsv($file, [
                    ++$i,
                    $col['date'],
                    $col['employee_id'] ?? "---",
                    $col['employee']["display_name"] ?? "---",
                    $col["in1"] ?? "---",
                    $col["out1"] ?? "---",
                    $col["in2"] ?? "---",
                    $col["out2"] ?? "---",
                    $col["in3"] ?? "---",
                    $col["out3"] ?? "---",
                    $col["in4"] ?? "---",
                    $col["out4"] ?? "---",
                    $col["in5"] ?? "---",
                    $col["out5"] ?? "---",
                    $col["in6"] ?? "---",
                    $col["out6"] ?? "---",
                    $col["in7"] ?? "---",
                    $col["out7"] ?? "---",
                    $col["total_hrs"] ?? "---",
                    $col["ot"] ?? "---",
                    $col["status"] ?? "---",

                ], ",");
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function performanceReport(Request $request)
    {
        $companyId = $request->input('company_id', 0);
        $branch_id = $request->input('branch_id', 0);

        $fromDate = $request->input('from_date', date("Y-m-d"));
        $toDate   = $request->input('to_date', date("Y-m-d"));

        $department_ids = $request->department_ids;

        if (gettype($department_ids) !== "array") {
            $department_ids = explode(",", $department_ids);
        }

        $employeeIds = [];

        if (! empty($request->employee_id)) {
            $employeeIds = is_array($request->employee_id) ? $request->employee_id : explode(",", $request->employee_id);
        }

        $model = Attendance::where('company_id', $companyId)
            ->when($branch_id, function ($q) use ($branch_id) {
                $q->whereHas('employee', fn($query) => $query->where('branch_id', $branch_id));
            })

            ->when(count($department_ids), function ($q) use ($department_ids) {
                $q->whereHas('employee', fn($query) => $query->whereIn('department_id', $department_ids));
            })
            ->when(count($employeeIds), function ($q) use ($employeeIds) {
                $q->whereIn('employee_id', $employeeIds);
            })

            ->whereBetween('date', [$fromDate, $toDate]);

        $model->select(
            'employee_id',
            $this->getStatusCountWithSuffix('P'),
            $this->getStatusCountWithSuffix('LC'),
            $this->getStatusCountWithSuffix('EG'),
            $this->getStatusCountWithSuffix('A'),
            $this->getStatusCountWithSuffix('M'),
            $this->getStatusCountWithSuffix('O'),
            $this->getStatusCountWithSuffix('L'),
            $this->getStatusCountWithSuffix('V'),
            $this->getStatusCountWithSuffix('H'),
        );

        $model->whereHas("employee", fn($q) => $q->where("company_id", request("company_id")));

        $model->with(["employee" => function ($q) {
            $q->where("company_id", request("company_id"));
            $q->withOut("schedule", "user");
            $q->with("reporting_manager:id,reporting_manager_id,first_name");
            $q->with(["schedule_all" => function ($q) {
                $q->where("company_id", request("company_id"));
                $q->select([
                    "id",
                    "shift_id",
                    "employee_id",
                    "shift_type_id",
                    "company_id",
                ]);
                $q->with(["shift" => function ($q) {
                    $q->select([
                        "id",
                        "working_hours",
                        "days",
                    ]);
                }]);
            }]);
            $q->select(
                "first_name",
                "last_name",
                "profile_picture",
                "phone_number",
                "whatsapp_number",
                "employee_id",
                "joining_date",
                "designation_id",
                "department_id",
                "user_id",
                "sub_department_id",
                "overtime",
                "title",
                "status",
                "company_id",
                "branch_id",
                "system_user_id",
                "display_name",
                "full_name",
                "home_country",
                "reporting_manager_id",
                "local_email",
                "home_email",
                "leave_group_id"
            );
        }])
            ->groupBy('employee_id');

        return $model->paginate($request->per_page ?? 100);
    }

    public function summaryReport(Request $request)
    {
        $companyId = $request->input('company_id', 0);
        $branch_id = $request->input('branch_id', 0);

        $fromDate = $request->input('from_date', date("Y-m-d"));
        $toDate   = $request->input('to_date', date("Y-m-d"));

        $department_ids = $request->department_ids;

        if (gettype($department_ids) !== "array") {
            $department_ids = explode(",", $department_ids);
        }

        $employeeIds = [];

        if (! empty($request->employee_id)) {
            $employeeIds = is_array($request->employee_id) ? $request->employee_id : explode(",", $request->employee_id);
        }

        $model = Attendance::where('company_id', $companyId)
            ->when($branch_id, function ($q) use ($branch_id) {
                $q->whereHas('employee', fn($query) => $query->where('branch_id', $branch_id));
            })

            ->when(count($department_ids), function ($q) use ($department_ids) {
                $q->whereHas('employee', fn($query) => $query->whereIn('department_id', $department_ids));
            })
            ->when(count($employeeIds), function ($q) use ($employeeIds) {
                $q->whereIn('employee_id', $employeeIds);
            })

            ->whereBetween('date', [$fromDate, $toDate]);

        $model->select(
            'employee_id',
            $this->getTotalHours(),
            $this->getInHours(),
            $this->getOutHours(),
            $this->getStatusCountWithSuffix('P'),
            $this->getStatusCountWithSuffix('LC'),
            $this->getStatusCountWithSuffix('EG'),
            $this->getStatusCountWithSuffix('A'),
            $this->getStatusCountWithSuffix('M'),
            $this->getStatusCountWithSuffix('O'),
            $this->getStatusCountWithSuffix('L'),
            $this->getStatusCountWithSuffix('V'),
            $this->getStatusCountWithSuffix('H'),
        );

        $model->whereHas("employee", fn($q) => $q->where("company_id", request("company_id")));

        $model->with(["employee" => function ($q) {
            $q->where("company_id", request("company_id"));
            $q->withOut("schedule", "user");
            $q->with("reporting_manager:id,reporting_manager_id,first_name");
            $q->with(["schedule_all" => function ($q) {
                $q->where("company_id", request("company_id"));
                $q->select([
                    "id",
                    "shift_id",
                    "employee_id",
                    "shift_type_id",
                    "company_id",
                ]);
                $q->with(["shift" => function ($q) {
                    $q->select([
                        "id",
                        "working_hours",
                        "days",
                        "weekend1",
                        "weekend2",
                        "monthly_flexi_holidays",
                    ]);
                }]);
            }]);
            $q->select(
                "first_name",
                "last_name",
                "profile_picture",
                "phone_number",
                "whatsapp_number",
                "employee_id",
                "joining_date",
                "designation_id",
                "department_id",
                "user_id",
                "sub_department_id",
                "overtime",
                "title",
                "status",
                "company_id",
                "branch_id",
                "system_user_id",
                "display_name",
                "full_name",
                "home_country",
                "reporting_manager_id",
                "local_email",
                "home_email",
                "leave_group_id"
            );
        }])
            ->groupBy('employee_id');

        $paginated = $model->paginate($request->per_page ?? 100);

        // Recalculate weekoff counts for employees that have absent records
        $employeesWithAbsent = collect($paginated->items())->filter(fn($item) => ($item->a_count ?? 0) > 0);

        if ($employeesWithAbsent->isNotEmpty()) {
            $empIds = $employeesWithAbsent->pluck('employee_id')->toArray();

            $rawRecords = Attendance::where('company_id', $companyId)
                ->whereIn('employee_id', $empIds)
                ->whereBetween('date', [$fromDate, $toDate])
                ->whereIn('status', ['A', 'O'])
                ->with(['employee' => function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                    $q->with(['schedule' => function ($q) use ($companyId) {
                        $q->where('company_id', $companyId);
                        $q->select('id', 'shift_id', 'employee_id');
                        $q->withOut('shift_type');
                    }, 'schedule.shift' => function ($q) use ($companyId) {
                        $q->where('company_id', $companyId);
                        $q->select('id', 'weekend1', 'weekend2', 'monthly_flexi_holidays');
                    }]);
                }])
                ->orderBy('date', 'asc')
                ->get();

            \App\Services\Attendance\AttendanceWeekOffService::recalculateForReport($rawRecords, (int) $companyId);

            // Recount per employee
            $recounted = $rawRecords->groupBy('employee_id')->map(function ($records) {
                return [
                    'o_count' => $records->where('status', 'O')->count(),
                    'a_count' => $records->where('status', 'A')->count(),
                ];
            });

            // Update paginated items with corrected counts
            foreach ($paginated->items() as $item) {
                if (isset($recounted[$item->employee_id])) {
                    $item->o_count = $recounted[$item->employee_id]['o_count'];
                    $item->a_count = $recounted[$item->employee_id]['a_count'];
                }
            }
        }

        return $paginated;
    }

    public function summaryReportDownload(Request $request)
    {

        $companyId = $request->input('company_id', 0);
        $branch_id = $request->input('branch_id', 0);

        $fromDate = $request->input('from_date', date("Y-m-d"));
        $toDate   = $request->input('to_date', date("Y-m-d"));

        $department_ids = $request->department_ids;

        if (gettype($department_ids) !== "array") {
            $department_ids = explode(",", $department_ids);
        }

        $employeeIds = [];

        if (! empty($request->employee_id)) {
            $employeeIds = is_array($request->employee_id) ? $request->employee_id : explode(",", $request->employee_id);
        }

        $cacheKey = 'attendance_summary_' . md5(json_encode([
            'company_id'     => $companyId,
            'branch_id'      => $branch_id,
            'from_date'      => $fromDate,
            'to_date'        => $toDate,
            'department_ids' => $department_ids,
            'employee_ids'   => $employeeIds,
        ]));

        Cache::forget($cacheKey);

        $model = Attendance::where('company_id', $companyId)
            ->when($branch_id, function ($q) use ($branch_id) {
                $q->whereHas('employee', fn($query) => $query->where('branch_id', $branch_id));
            })

            ->when(count($department_ids), function ($q) use ($department_ids) {
                $q->whereHas('employee', fn($query) => $query->whereIn('department_id', $department_ids));
            })
            ->when(count($employeeIds), function ($q) use ($employeeIds) {
                $q->whereIn('employee_id', $employeeIds);
            })

            ->whereBetween('date', [$fromDate, $toDate]);

        $model->select(
            'employee_id',
            $this->getTotalHours(),
            $this->getInHours(),
            $this->getOutHours(),
            $this->getStatusCountWithSuffix('P'),
            $this->getStatusCountWithSuffix('LC'),
            $this->getStatusCountWithSuffix('EG'),
            $this->getStatusCountWithSuffix('A'),
            $this->getStatusCountWithSuffix('M'),
            $this->getStatusCountWithSuffix('O'),
            $this->getStatusCountWithSuffix('L'),
            $this->getStatusCountWithSuffix('V'),
            $this->getStatusCountWithSuffix('H'),
        );

        $model->whereHas("employee_report_only", fn($q) => $q->where("company_id", request("company_id")));

        $model->with(["employee_report_only" => function ($q) {
            $q->where("company_id", request("company_id"));
            $q->withOut("schedule", "user");
            $q->with("reporting_manager:id,reporting_manager_id,first_name");
            $q->with(["schedule_all" => function ($q) {
                $q->where("company_id", request("company_id"));
                $q->select([
                    "id",
                    "shift_id",
                    "employee_id",
                    "shift_type_id",
                    "company_id",
                ]);
                $q->with(["shift" => function ($q) {
                    $q->select([
                        "id",
                        "working_hours",
                        "days",
                    ]);
                }]);
            }]);
            $q->select(
                "first_name",
                "last_name",
                "profile_picture",
                "phone_number",
                "whatsapp_number",
                "employee_id",
                "joining_date",
                "designation_id",
                "department_id",
                "user_id",
                "sub_department_id",
                "overtime",
                "title",
                "status",
                "company_id",
                "branch_id",
                "system_user_id",
                "display_name",
                "full_name",
                "home_country",
                "reporting_manager_id",
                "local_email",
                "home_email",
                "leave_group_id"
            );
        }])
            ->groupBy('employee_id');

        return $model->paginate(10);
    }

    public function getStatusCountWithSuffix($dbDtatus)
    {
        $status = strtolower($dbDtatus);

        return DB::raw("COUNT(CASE WHEN status = '{$dbDtatus}' THEN 1 END) AS {$status}_count");
    }

    public function getTotalHours()
    {

        $driver = DB::connection()->getDriverName(); // Get the database driver name

        if ($driver === 'sqlite') {
            return DB::raw("json_group_array(total_hrs) FILTER (WHERE total_hrs != '---') AS total_hrs_array");
        } else {
            return DB::raw("json_agg(\"total_hrs\"::TEXT) FILTER (WHERE \"total_hrs\" != '---') AS total_hrs_array");
        }
    }
    public function getInHours()
    {
        $driver = DB::connection()->getDriverName(); // Get the database driver name
        if ($driver === 'sqlite') {
            return DB::raw("json_group_array(\"in\") FILTER (WHERE \"in\" != '---') AS average_in_time_array");
        } else {
            return DB::raw("json_agg(\"in\"::TEXT) FILTER (WHERE \"in\" != '---') AS average_in_time_array");
        }
    }
    public function getOutHours()
    {
        $driver = DB::connection()->getDriverName(); // Get the database driver name
        if ($driver === 'sqlite') {
            return DB::raw("json_group_array(\"out\") FILTER (WHERE \"out\" != '---') AS average_out_time_array");
        } else {
            return DB::raw("json_agg(\"out\"::TEXT) FILTER (WHERE \"out\" != '---') AS average_out_time_array");
        }
    }

    public function getStatusCountValue($status)
    {
        return DB::raw("COUNT(CASE WHEN status = '$status' THEN 1 END) AS {$status}_count_value");
    }

    public function lastSixMonthsPerformanceReport(Request $request)
    {
        $companyId  = $request->input('company_id', 0);
        $employeeId = $request->input('employee_id', 0);

        $startMonth = Carbon::now()->subMonths(5)->startOfMonth()->toDateString(); // Removes time
        $endMonth   = Carbon::now()->endOfMonth()->toDateString();                 // Removes time
        // $endMonth = Carbon::now()->toDateString();  // Removes time

        $startMonthOnly = Carbon::now()->subMonths(5)->startOfMonth();
        $endMonthOnly   = Carbon::now()->endOfMonth();

        $months = [];
        for ($month = $startMonthOnly; $month <= $endMonthOnly; $startMonthOnly->addMonth()) {
            $months[] = [
                'year'  => $month->year,
                'month' => $month->month,
            ];
        }

        // Now, use these dates in your query
        $driver = DB::connection()->getDriverName(); // Get the database driver

        if ($driver === 'sqlite') {
            // SQLite uses strftime() for extracting Year and Month
            $query = DB::table('attendances')
                ->select(
                    DB::raw("strftime('%Y', date) AS year"),
                    DB::raw("strftime('%m', date) AS month"),
                    DB::raw("SUM(CASE WHEN status in ('P','LC','EG') THEN 1 ELSE 0 END) AS present_count"),
                    DB::raw("SUM(CASE WHEN status in ('A','M') THEN 1 ELSE 0 END) AS absent_count"),
                    DB::raw("SUM(CASE WHEN status in ('O') THEN 1 ELSE 0 END) AS week_off_count"),
                    DB::raw("SUM(CASE WHEN status in ('L','V','H',) THEN 1 ELSE 0 END) AS other_count")
                )
                ->where('company_id', $companyId)
                ->where('employee_id', $employeeId)
                ->whereBetween('date', [$startMonth, $endMonth]) // Date-only comparison
                ->groupBy(DB::raw("strftime('%Y', date)"), DB::raw("strftime('%m', date)"))
                ->orderBy(DB::raw("strftime('%Y', date)"), 'desc')
                ->orderBy(DB::raw("strftime('%m', date)"), 'desc')
                ->get();
        } else {
            // Now, use these dates in your query
            $query = DB::table('attendances')
                ->select(
                    DB::raw('EXTRACT(YEAR FROM date) AS year'),
                    DB::raw('EXTRACT(MONTH FROM date) AS month'),
                    DB::raw('SUM(CASE WHEN status IN (\'P\',\'LC\',\'EG\') THEN 1 ELSE 0 END) AS present_count'),
                    DB::raw('SUM(CASE WHEN status IN (\'A\',\'M\') THEN 1 ELSE 0 END) AS absent_count'),
                    DB::raw('SUM(CASE WHEN status IN (\'O\') THEN 1 ELSE 0 END) AS week_off_count'),
                    DB::raw('SUM(CASE WHEN status IN (\'L\',\'V\',\'H\') THEN 1 ELSE 0 END) AS other_count')
                )
                ->where('company_id', $companyId)
                ->where('employee_id', $employeeId)
                ->whereBetween('date', [$startMonth, $endMonth])
                ->groupBy(DB::raw('EXTRACT(YEAR FROM date)'), DB::raw('EXTRACT(MONTH FROM date)'))
                ->orderBy(DB::raw('EXTRACT(YEAR FROM date)'), 'desc')
                ->orderBy(DB::raw('EXTRACT(MONTH FROM date)'), 'desc')
                ->get();
        }

        $queryResults = [];

        // Get today's date
        $today = new DateTime();
        // Get the last day of the current month
        $endOfMonth = new DateTime('last day of this month');

        // Calculate remaining days (excluding today)
        $remainingDays = (int) $today->diff($endOfMonth)->format('%a');

        foreach ($months as $month) {
            $found = false;

            $monthFormatted = str_pad($month['month'], 2, '0', STR_PAD_LEFT);
            $month_year     = date("M Y", strtotime("{$month['year']}-{$monthFormatted}-01"));

            foreach ($query as $result) {
                if ($result->year == $month['year'] && $result->month == $month['month']) {
                    $found          = true;
                    $isCurrentMonth = ($month['year'] == date('Y') && $month['month'] == date('n'));
                    $queryResults[] = (object) [
                        'year'           => $month['year'],
                        'month'          => $month['month'],
                        'present_count'  => $result->present_count,
                        'absent_count'   => $isCurrentMonth ? ($result->absent_count - $remainingDays) : $result->absent_count,
                        'week_off_count' => $result->week_off_count,
                        'other_count'    => $result->other_count,
                        'month_year'     => date("M y", strtotime($month_year)),
                    ];
                    break;
                }
            }

            if (! $found) {
                // If the month was not found in the results, add it with counts as 0
                $queryResults[] = (object) [
                    'year'           => $month['year'],
                    'month'          => $month['month'],
                    'present_count'  => 0,
                    'absent_count'   => 31,
                    'week_off_count' => 0,
                    'other_count'    => 0,
                    'month_year'     => date("M y", strtotime($month_year)),
                ];
            }
        }

        return response()->json($queryResults);
    }

    public function lastSixMonthsSalaryReport(Request $request)
    {
        $startMonthOnly = Carbon::now()->subMonths(6)->startOfMonth();
        $endMonthOnly   = Carbon::now()->subMonths(1)->endOfMonth();

        $result = [];

        for ($month_year = $startMonthOnly; $month_year <= $endMonthOnly; $startMonthOnly->addMonth()) {
            $year     = $month_year->year;
            $month    = str_pad($month_year->month, 2, "0", STR_PAD_LEFT);
            $result[] = $this->getRenderedSalary($request->company_id, $request->employee_id, $month, $year);
        }

        return array_reverse($result);
    }

    public function previousMonthSalaryReport(Request $request)
    {
        // Get the first day of the previous month
        $previousMonth = date("m", strtotime("first day of previous month"));
        $year          = date("Y", strtotime("first day of previous month"));

        // Ensure the month is two digits (e.g., "01" for January)
        $month = str_pad($previousMonth, 2, "0", STR_PAD_LEFT);

        // Call the method to get the rendered salary report
        $response = $this->getRenderedSalary($request->company_id, $request->employee_id, $month, $year);

        return $response;
    }

    public function currentMonthHoursReport(Request $request)
    {
        // Validate input
        $request->validate([
            'company_id'  => 'required|integer|min:1',
            'employee_id' => 'required|integer|min:1',
        ]);

        $companyId     = $request->input('company_id');
        $employeeId    = $request->input('employee_id');
        $previousMonth = date('m', strtotime('last month'));

        try {
            // Base query for the current month, company, and employee
            $baseQuery = DB::table('attendances')
                ->where('company_id', $companyId)
                ->where('employee_id', $employeeId)
                ->whereMonth('date', $previousMonth);

            // Fetch total performed hours
            $totalHours          = (clone $baseQuery)->where('status', 'P')->pluck('total_hrs')->toArray();
            $totalPerformedHours = $this->sumTimeValues($totalHours);

            // Fetch late coming hours
            $totalLateComings = (clone $baseQuery)->where('late_coming', '!=', '---')->pluck('late_coming')->toArray();
            $lateComingHours  = $this->sumTimeValues($totalLateComings);

            // Fetch early going hours
            $totalEarlyGoings = (clone $baseQuery)->where('early_going', '!=', '---')->pluck('early_going')->toArray();
            $earlyGoingHours  = $this->sumTimeValues($totalEarlyGoings);

            // Fetch overtime hours

            $totalOtHours = (clone $baseQuery)->where('ot', '!=', '---')->pluck('ot')->toArray();
            $otHours      = $this->sumTimeValues($totalOtHours);

            return response()->json([
                'total_performed' => [
                    "hours" => $this->formatMinutesToTime($totalPerformedHours),
                    "days"  => count($totalHours),
                ],
                'late_coming'     => [
                    "hours" => $this->formatMinutesToTime($lateComingHours),
                    "days"  => count($totalLateComings),
                ],
                'early_going'     => [
                    "hours" => $this->formatMinutesToTime($earlyGoingHours),
                    "days"  => count($totalEarlyGoings),
                ],
                'overtime'        => [
                    "hours" => $this->formatMinutesToTime($otHours),
                    "days"  => count($totalOtHours),
                ],
            ]);
        } catch (\Exception $e) {
            // Handle any exceptions
            return response()->json([], 500);
        }
    }

    public function lastSixMonthsHoursReport(Request $request)
    {
        // Validate input
        $request->validate([
            'company_id'  => 'required|integer|min:1',
            'employee_id' => 'required|integer|min:1',
        ]);

        $companyId  = $request->input('company_id');
        $employeeId = $request->input('employee_id');

        try {
            $report = [];

            for ($i = 0; $i < 6; $i++) {
                $month = date('m', strtotime("-$i month"));
                $year  = date('Y', strtotime("-$i month"));

                // Base query for the given month
                $baseQuery = DB::table('attendances')
                    ->where('company_id', $companyId)
                    ->where('employee_id', $employeeId)
                    ->whereMonth('date', $month)
                    ->whereYear('date', $year);

                // Fetch and sum hours
                $totalHours          = (clone $baseQuery)->where('status', 'P')->pluck('total_hrs')->toArray();
                $totalPerformedHours = $this->sumTimeValues($totalHours);

                $totalLateComings = (clone $baseQuery)->where('late_coming', '!=', '---')->pluck('late_coming')->toArray();
                $lateComingHours  = $this->sumTimeValues($totalLateComings);

                $totalEarlyGoings = (clone $baseQuery)->where('early_going', '!=', '---')->pluck('early_going')->toArray();
                $earlyGoingHours  = $this->sumTimeValues($totalEarlyGoings);

                $totalOtHours = (clone $baseQuery)->where('ot', '!=', '---')->pluck('ot')->toArray();
                $otHours      = $this->sumTimeValues($totalOtHours);

                $monthLabel = date('M Y', strtotime("-$i month"));

                $report[$monthLabel] = [
                    'total_performed' => [
                        "hours" => $this->formatMinutesToTime($totalPerformedHours),
                        "days"  => count($totalHours),
                    ],
                    'late_coming'     => [
                        "hours" => $this->formatMinutesToTime($lateComingHours),
                        "days"  => count($totalLateComings),
                    ],
                    'early_going'     => [
                        "hours" => $this->formatMinutesToTime($earlyGoingHours),
                        "days"  => count($totalEarlyGoings),
                    ],
                    'overtime'        => [
                        "hours" => $this->formatMinutesToTime($otHours),
                        "days"  => count($totalOtHours),
                    ],
                ];
            }

            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json([], 500);
        }
    }

    public function previousMonthPerformanceReport(Request $request)
    {
        $companyId  = $request->input('company_id', 0);
        $employeeId = $request->input('employee_id', 0);
        $lastMonth  = $request->input('date', date('m', strtotime('first day of last month')));

        $result = Attendance::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->whereMonth('date', $lastMonth)
            ->select('date', 'status')
            ->orderBy('date')
            ->groupBy('date', 'status')
            ->get();

        $arr   = [];
        $stats = [
            "P"            => 0,
            "A"            => 0,
            "O"            => 0,
            "OTHERS_COUNT" => 0,
        ];

        foreach ($result as $item) {
            $dateKey = date("Y-m-d", strtotime($item->date));

            if (in_array($item->status, ['P', "LC", "EG"])) {
                $arr[$dateKey] = "green";
                $stats["P"] += 1;
            } else if (in_array($item->status, ['A', "M"])) {
                $arr[$dateKey] = "red";
                $stats["A"] += 1;
            } else if (in_array($item->status, ['O'])) {
                $arr[$dateKey] = "primary";
                $stats["O"] += 1;
            } else {
                $arr[$dateKey] = "orange";
                $stats["OTHERS_COUNT"] += 1;
            }
        }

        return ["events" => $arr, "stats" => $stats];
    }

    public function currentMonthPerformanceReport(Request $request)
    {
        $companyId    = $request->input('company_id', 0);
        $employeeId   = $request->input('employee_id', 0);
        $currentMonth = $request->input('date', date('m'));

        $result = Attendance::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->whereMonth('date', $currentMonth)
            ->select('date', 'status')
            ->orderBy('date')
            ->groupBy('date', 'status')
            ->get();

        $arr   = [];
        $stats = [
            "P"            => 0,
            "A"            => 0,
            "O"            => 0,
            "L"            => 0,
            "OTHERS_COUNT" => 0,
        ];

        foreach ($result as $item) {
            $itemDate = date("Y-m-d", strtotime($item->date));

            if (in_array($item->status, ['P', "LC", "EG"])) {
                $arr[$itemDate] = "green";
                $stats["P"] += 1;
            } else if (in_array($item->status, ['A', "M"])) {
                $arr[$itemDate] = "";
                if ($itemDate <= date("Y-m-d")) {
                    $stats["A"] += 1;
                    $arr[$itemDate] = "red";
                }
            } else if (in_array($item->status, ['L'])) {
                $arr[$itemDate] = "";
                if ($itemDate <= date("Y-m-d")) {
                    $stats["L"] += 1;
                    $arr[$itemDate] = "orange";
                }
            } else if (in_array($item->status, ['O'])) {
                $arr[$itemDate] = "primary";
                $stats["O"] += 1;
            } else {
                $arr[$itemDate] = "orange";
                $stats["OTHERS_COUNT"] += 1;
            }
        }

        return ["events" => $arr, "stats" => $stats];
    }

    /**
     * Helper function to sum time values in "HH:MM" format.
     *
     * @param array $timeValues Array of time strings in "HH:MM" format.
     * @return int Total time in minutes.
     */
    private function sumTimeValues(array $timeValues): int
    {
        $totalMinutes = 0;

        foreach ($timeValues as $time) {
            list($hours, $minutes) = explode(':', $time);
            $totalMinutes += ($hours * 60) + $minutes;
        }

        return $totalMinutes;
    }

    /**
     * Helper function to convert total minutes back to "HH:MM" format.
     *
     * @param int $minutes Total minutes.
     * @return string Time in "HH:MM" format.
     */
    private function formatMinutesToTime(int $minutes): string
    {
        $hours   = floor($minutes / 60);
        $minutes = $minutes % 60;
        return sprintf('%02d:%02d', $hours, $minutes);
    }

    public function calculateHoursAndMinutes(array $timeStrings): array
    {
        $totalMinutes = array_reduce($timeStrings, function ($carry, $time) {
            // Ensure the time is in the correct format
            if (preg_match('/^\d{1,2}:\d{2}$/', $time)) {
                list($hours, $minutes) = explode(':', $time);
                return $carry + ($hours * 60) + $minutes; // Convert to total minutes
            }

            throw new \InvalidArgumentException("Invalid time format: {$time}. Expected 'hh:mm'.");
        }, 0);

        $hours   = intdiv($totalMinutes, 60);
        $minutes = $totalMinutes % 60;

        return [
            "hours"   => $hours,
            "minutes" => $minutes,
            "hm"      => sprintf("%02d:%02d", $hours, $minutes), // Format as 'hh:mm'
        ];
    }

    public function getRenderedSalary($company_id, $id, $month, $year)
    {
        // Fetch the last six months' payroll data
        $Payroll = Payroll::where("employee_id", $id)
            ->where("company_id", $company_id)
            ->with(["company", "payroll_formula"])
            ->with(["employee" => function ($q) {
                $q->withOut(["user", "schedule"]);
            }])
            ->first(["basic_salary", "net_salary", "earnings", "employee_id", "company_id", "created_at"]);

        if (! $Payroll) {
            return response()->json(["message" => "No Data Found"], 404);
        }

        $days_countdate = DateTime::createFromFormat('Y-m-d', $Payroll->created_at->format('Y-m-d'));

        $Payroll->total_month_days = $days_countdate->format('t');

        $salary_type = $Payroll->payroll_formula->salary_type ?? "basic_salary";

        $Payroll->salary_type = ucwords(str_replace("_", " ", $salary_type));

        $Payroll->date = $Payroll->created_at->format('j F Y');

        $Payroll->SELECTEDSALARY = $salary_type == "basic_salary" ? $Payroll->basic_salary : $Payroll->net_salary;
        $Payroll->perDaySalary   = number_format($Payroll->SELECTEDSALARY / $Payroll->total_month_days, 2);
        $Payroll->perHourSalary  = number_format($Payroll->perDaySalary / 8, 2);

        $conditions = [
            "company_id"  => $company_id,
            "employee_id" => $Payroll->employee->system_user_id,
        ];

        $allStatuses = ['P', 'A', 'M', 'O', 'LC', 'EG'];

        $attendances = Attendance::where($conditions)
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->whereIn('status', $allStatuses)
            ->orderBy("date", "asc")
            ->get();

        $otherCalculations = $attendances;

        $lateHours = $otherCalculations->filter(function ($attendance) {
            return $attendance->late_coming !== '---';
        })->pluck('late_coming')->toArray();

        $earlyHours = $otherCalculations->filter(function ($attendance) {
            return $attendance->early_going !== '---';
        })->pluck('early_going')->toArray();

        $otHours = $otherCalculations->filter(function ($attendance) {
            return $attendance->ot !== '---';
        })->pluck('ot')->toArray();

        $Payroll->lateHours          = $this->calculateHoursAndMinutes($lateHours);
        $Payroll->earlyHours         = $this->calculateHoursAndMinutes($earlyHours);
        $Payroll->otHours            = $this->calculateHoursAndMinutes($otHours);
        $shortHours                  = array_merge($lateHours, $earlyHours);
        $Payroll->combimedShortHours = $this->calculateHoursAndMinutes($shortHours);
        $totalHours                  = $Payroll->combimedShortHours["hours"] ?? 0;
        $remainingMinutes            = $Payroll->combimedShortHours["minutes"] ?? "00:00";
        $decimalHours                = $totalHours + ($remainingMinutes / 60);
        $rate                        = $Payroll->perHourSalary;

        $shortHours = 0; // Set a default value or handle it accordingly

        if ($Payroll->payroll_formula && isset($Payroll->payroll_formula->deduction_value)) {
            $shortHours = $decimalHours * $rate * $Payroll->payroll_formula->deduction_value;
        }

        $grouByStatus = $attendances
            ->groupBy('status')
            ->map(fn($group) => $group->count())
            ->toArray();

        $attendanceCounts = array_merge(array_fill_keys($allStatuses, 0), $grouByStatus);

        $Payroll->present = array_sum([
            $attendanceCounts["P"],
            $attendanceCounts["LC"],
            $attendanceCounts["EG"],
        ]);

        $Payroll->absent = array_sum([
            $attendanceCounts["A"],
            $attendanceCounts["M"],
        ]);

        $Payroll->week_off = $attendanceCounts["O"];

        $Payroll->deductedSalary = round($Payroll->absent * $Payroll->perDaySalary);

        $OTHours = $Payroll->otHours["hours"];

        $OTEarning = 0;

        if ($Payroll->payroll_formula && isset($Payroll->payroll_formula->ot_value)) {
            $OTEarning = $Payroll->perHourSalary * $OTHours * $Payroll->payroll_formula->ot_value;
        }

        $Payroll->earnings = array_merge(
            [
                [
                    "label" => "Basic",
                    "value" => (int) $Payroll->SELECTEDSALARY,
                ],
                [
                    "label" => "OT",
                    "value" => $OTEarning,
                ],
            ],
            $Payroll->earnings,
        );

        $Payroll->totalDeductions = ($Payroll->deductedSalary + $shortHours);

        $Payroll->salary_and_earnings = array_sum(array_column($Payroll->earnings, "value"));

        if ($Payroll->present == 0) {
            $Payroll->salary_and_earnings = 0;
            $Payroll->finalSalary         = 0;
        }

        $Payroll->finalSalary = (($Payroll->salary_and_earnings) - $Payroll->totalDeductions);

        $Payroll->payslip_month_year = $days_countdate->format('F Y');

        return [
            "finalSalary"               => number_format($Payroll->finalSalary < 0 ? 0 : $Payroll->finalSalary, 2),
            'year'                      => $year,
            'month'                     => DateTime::createFromFormat('!m', $month)->format('M'), // Convert month number to month name (e.g., "Jan")
            'salary_type'               => $Payroll->salary_type,
            'salary_and_earnings'       => number_format($Payroll->salary_and_earnings, 2),
            'ot'                        => number_format($OTEarning, 2),
            'total_deductions'          => number_format($Payroll->totalDeductions, 2),

            'salary_and_earnings_value' => round($Payroll->salary_and_earnings),
            'ot_value'                  => round($OTEarning),
            'total_deductions_value'    => round($Payroll->totalDeductions),
        ];
    }

    public function performanceReportSingle(Request $request)
    {
        $companyId = $request->input('company_id', 2);
        $employeeId = $request->input('employee_id', 7);
        $fromDate = $request->input('from_date', date("Y-m-d"));
        $toDate   = $request->input('to_date', date("Y-m-d"));

        $model = Employee::where('company_id', $companyId)
            ->when($employeeId, fn($q) => $q->where('employee_id', $employeeId))
            ->with([
                'attendances' => function ($q) use ($fromDate, $toDate, $companyId) {
                    $q->whereBetween('date', [$fromDate, $toDate])
                        ->where('company_id', $companyId);
                },
                'reporting_manager:id,reporting_manager_id,first_name',
                'schedule' => function ($q) use ($companyId) {
                    $q->where('company_id', $companyId)->with(['shift:id,working_hours,days']);
                },
            ])
            ->first();

        if (!$model) return response()->json(['message' => 'Not found'], 404);

        $start = \Carbon\Carbon::parse($fromDate);
        $end = \Carbon\Carbon::parse($toDate);

        // Logic Variables
        $monthCount = $start->diffInMonths($end) + 1;
        $shiftDaysArray = $model->schedule->shift->days ?? [];
        $workingDaysInWeek = count($shiftDaysArray) > 0 ? count($shiftDaysArray) : 5;
        $requiredMinutes = $this->timeToMinutes($model->schedule->shift->working_hours ?? "08:00");

        // Summary Variables
        $totalOnTimeCount = 0;
        $totalGlobalLostMinutes = 0;
        $monthlyData = [];

        // --- MONTHLY BREAKDOWN ---
        $tempStart = $start->copy()->startOfMonth();
        $tempEnd = $end->copy()->startOfMonth();

        while ($tempStart <= $tempEnd) {
            $currentMonth = $tempStart->month;
            $currentYear = $tempStart->year;

            $monthAttendances = $model->attendances->filter(function ($item) use ($currentMonth, $currentYear) {
                $date = \Carbon\Carbon::parse($item->date);
                return $date->month == $currentMonth && $date->year == $currentYear;
            });

            $monthOnTimeCount = 0;
            $totalMonthLostMinutes = 0;

            foreach ($monthAttendances as $att) {
                // Count On-Time (Present & No Late)
                if ($att->status === 'P' && ($att->late_coming === "---" || $att->late_coming === "00:00")) {
                    $monthOnTimeCount++;
                    $totalOnTimeCount++; // For Global Summary
                }

                // Calculate Lost Minutes
                if ($att->status === 'P') {
                    $actualMinutes = $this->timeToMinutes($att->total_hrs);
                    if ($actualMinutes < $requiredMinutes) {
                        $lost = ($requiredMinutes - $actualMinutes);
                        $totalMonthLostMinutes += $lost;
                        $totalGlobalLostMinutes += $lost; // For Global Summary
                    }
                }
            }

            $expectedInMonth = $workingDaysInWeek * 4;
            $monthPunctuality = ($expectedInMonth > 0) ? round(($monthOnTimeCount / $expectedInMonth) * 100) . "%" : "0%";

            $monthlyData[] = [
                'month' => $tempStart->format('F Y'),
                'present' => $monthAttendances->where('status', 'P')->count() ?? 0,
                'absent' => $monthAttendances->where('status', 'A')->count() ?? 0,
                'leave' => $monthAttendances->where('status', 'L')->count() ?? 0,
                'punctuality' => $monthPunctuality,
                'total_hrs' => $this->getTotalHrs($monthAttendances->pluck('total_hrs')),
                'ot_hrs' => $this->getTotalHrs($monthAttendances->pluck('ot')),
                'lost_hrs' => $this->minutesToTime($totalMonthLostMinutes),
            ];

            $tempStart->addMonth();
        }

        // --- FINAL SUMMARY CALCULATIONS ---
        $daysPresent = $model->attendances->where("status", "P")->count();
        $totalExpectedInPeriod = $workingDaysInWeek * 4 * $monthCount;

        // Overall Attendance Rate
        $overallAttendanceRate = ($totalExpectedInPeriod > 0)
            ? number_format(min(($daysPresent / $totalExpectedInPeriod) * 100, 100), 1) . "%"
            : "0.0%";

        // Overall Punctuality
        $overallPunctuality = ($totalExpectedInPeriod > 0)
            ? round(($totalOnTimeCount / $totalExpectedInPeriod) * 100) . "%"
            : "0%";

        // Attach data to model
        $model->monthly_breakdown = $monthlyData;
        $model->summary = [
            'total_attendance_rate' => $overallAttendanceRate,
            'total_punctuality' => $overallPunctuality,
            'total_hrs' => $this->getTotalHrs($model->attendances->pluck('total_hrs')),
            'total_ot_hrs' => $this->getTotalHrs($model->attendances->pluck('ot')),
            'total_lost_hrs' => $this->minutesToTime($totalGlobalLostMinutes),
            'total_present' => $daysPresent,
            'total_expected_working_days' => $totalExpectedInPeriod,
        ];


        $model->chart_data = collect($monthlyData)->map(function ($item) {
            return [
                "name"       => \Carbon\Carbon::parse($item['month'])->format('M'),
                "attendance" => $item['present'],
                // Using your existing timeToMinutes helper to make it a number
                "overtime"   => round($this->timeToMinutes($item['ot_hrs'] ?: "00:00") / 60, 2),
                "lost"       => round($this->timeToMinutes($item['lost_hrs'] ?: "00:00") / 60, 2),
            ];
        })->values();

        // return $model->chart_data;

        return $model;
    }

    /**
     * Helpers
     */
    private function timeToMinutes($timeStr)
    {
        if (!$timeStr || $timeStr === "---" || $timeStr === "0 h") return 0;
        $timeStr = str_replace(' h', ':00', $timeStr);
        $parts = explode(':', $timeStr);
        return ((int)$parts[0] * 60) + (int)($parts[1] ?? 0);
    }

    private function minutesToTime($totalMinutes)
    {
        $hours = floor($totalMinutes / 60);
        $minutes = $totalMinutes % 60;
        return sprintf('%02d:%02d', $hours, $minutes);
    }

    function getTotalHrs($times)
    {

        $totalMinutes = 0;

        foreach ($times as $time) {
            if ($time === "---") continue; // skip invalid entries
            list($hours, $minutes) = explode(":", $time);
            $totalMinutes += ($hours * 60) + $minutes;
        }

        return round($totalMinutes / 60) . " h";
    }
}
