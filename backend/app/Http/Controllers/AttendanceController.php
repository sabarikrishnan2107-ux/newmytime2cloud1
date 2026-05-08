<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Shift\FiloShiftController;
use App\Http\Controllers\Shift\MultiInOutShiftController;
use App\Http\Controllers\Shift\NightShiftController;
use App\Http\Controllers\Shift\RenderController;
use App\Http\Controllers\Shift\SingleShiftController;
use App\Http\Controllers\Shift\SplitShiftController;
use App\Models\AttendanceLog;
use App\Models\Attendance;
use App\Models\Device;
use App\Models\Employee;
use App\Models\ScheduleEmployee;
use App\Models\Shift;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log as Logger;
use Symfony\Component\Console\Output\BufferedOutput;

class AttendanceController extends Controller
{
    public function seedDefaultData($company_id, $UserIds = [], $branch_id = '')
    {


        $params = ["company_id" => $company_id, "date" => date("Y-m-d"), "branch_id" => $branch_id, "UserIds" => $UserIds];

        $employees = Employee::query();

        $employees->where("company_id", $params["company_id"]);

        $employees->withOut(["department", "sub_department", "designation"]);

        $employees->with(["schedule" => function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->where("to_date", ">=", $params["date"]);
            // $q->where("shift_type_id", $params["shift_type_id"]);
            $q->withOut("shift_type");
            $q->select("shift_id", "isOverTime", "employee_id", "shift_type_id");
            $q->orderBy("to_date", "asc");
        }]);
        $employees->when($branch_id != '', function ($q) use ($params) {
            $q->where("branch_id", $params["branch_id"]);
        });

        $employees->when(count($params["UserIds"] ?? []) > 0, function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->whereIn("system_user_id", $params["UserIds"]);
        });


        if (!$employees->count()) {
            info("No record found");
            return;
        }
        // $attendance = Attendance::query();
        // $attendance->where("company_id", $company_id);
        // $attendance->whereMonth("date", date("m"));
        // $attendance->delete();
        $daysInMonth = Carbon::now()->month(date('m'))->daysInMonth;

        $employees = $employees->get(["system_user_id"]);

        $data = [];

        foreach ($employees as $employee) {



            foreach (range(1, $daysInMonth) as $day) {
                $data[] = [
                    "date" => date("Y-m-") . sprintf("%02d", date($day)),
                    "employee_id" => $employee->system_user_id,
                    "shift_id" => $employee->schedule ? $employee->schedule->shift_id : null,
                    "shift_type_id" => $employee->schedule ? $employee->schedule->shift_type_id : null,
                    "status" => "A",
                    "in" => "---",
                    "out" => "---",
                    "total_hrs" => "---",
                    "ot" => "---",
                    "late_coming" => "---",
                    "early_going" => "---",
                    "device_id_in" => "---",
                    "device_id_out" => "---",
                    "company_id" => $company_id,
                    "created_at"    => date('Y-m-d H:i:s'),
                    "updated_at"    => date('Y-m-d H:i:s'),
                    "updated_func" => "seedDefaultData"
                ];
            }
        }

        $chunks = array_chunk($data, 100);

        $insertedCount = 0;


        $attendance = Attendance::query();
        $attendance->where("company_id", $company_id);
        if (count($UserIds) > 0) {
            $attendance->where("employee_id", $UserIds[0]);
        }
        $attendance->whereMonth("date", date("m"));
        $attendance->delete();


        foreach ($chunks as $chunk) {
            Attendance::insert($chunk);
            //$attendance->updateOrCreate($chunk);
            $insertedCount += count($chunk);
        }

        $message = "Cron AttendanceSeeder: " . $insertedCount . " record has been inserted.";

        Logger::channel("defaulSeeder")->info('Cron: Creating Default seeder. seedDefaultData: ' .  $message);
        return $message;
    }

    public function getAttendanceTabsDisplay(Request $request)
    {
        return [
            "single" => Shift::where("company_id", $request->company_id)->whereIn("shift_type_id", [1, 4, 6])->exists(),
            "double" => Shift::where("company_id", $request->company_id)->whereIn("shift_type_id", [5])->exists(),
            "multi" => Shift::where("company_id", $request->company_id)->whereIn("shift_type_id", [2])->exists()
        ];

        $model = Shift::where("company_id", $request->company_id);


        $singleShiftEmployeeCount = $model->clone()->whereIn("shift_type_id", [1,    4, 5, 6])->get()->count();
        $DualShiftEmployeeCount  =  $model->clone()->where("shift_type_id", 7)->get()->count();
        $multiShiftEmployeeCount  =  $model->clone()->where("shift_type_id", 2)->get()->count();
        $date = date("Y-m-d");
        if ($request->filled("date")) {
            $date = $request->to_date;
        }


        if ($singleShiftEmployeeCount == 0) {
            $singleShiftEmployeeCount = Attendance::where("date", '>=', $date . ' 00:00:00')
                ->where("date", '<=',  $date . ' 23:59:00')
                ->where("company_id", $request->company_id)
                ->whereIn("shift_type_id", [1,    4, 5, 6])

                ->get()->count();
        }
        if ($DualShiftEmployeeCount == 0) {
            $DualShiftEmployeeCount = Attendance::where("date", '>=', $date . ' 00:00:00')
                ->where("date", '<=',  $date . ' 23:59:00')
                ->where("company_id", $request->company_id)
                ->where("shift_type_id", 7)->get()->count();
        }
        if ($multiShiftEmployeeCount == 0) {
            $multiShiftEmployeeCount = Attendance::where("date", '>=', $date . ' 00:00:00')
                ->where("date", '<=',  $date . ' 23:59:00')
                ->where("company_id", $request->company_id)
                ->where("shift_type_id", 2)->get()->count();
        }


        return [
            "single" => $singleShiftEmployeeCount > 0 ? true : false,
            "dual" => $DualShiftEmployeeCount > 0 ? true : false,
            "multi" => $multiShiftEmployeeCount > 0 ? true : false
        ];
    }
    public function attendance_avg_clock(Request $request)
    {
        //     $attendanceCounts =   AttendanceLog::selectRaw('DATE("LogTime") as date, MIN("LogTime") as first_entry')
        //     ->groupBy('date')
        //     ->orderBy('date', 'asc')->get();;


        // return $attendanceCounts;
        // Assuming your timestamps are stored in a 'timestamp' column in your model's database table
        //$timestamps = AttendanceLog::pluck('LogTime');


        $avg_clock_in = $this->getAvgClockIn($request);
        $avg_clock_out = $this->getAvgClockOut($request);
        $avg_working_hours = $this->getAvgWorkingHours($request);
        $leavesArray = $this->getEmployeeLeavecount($request);

        return ["avg_clock_in" => $avg_clock_in, "avg_clock_out" => $avg_clock_out, "avg_working_hours" => $avg_working_hours, "leaves" => $leavesArray];
    }

    public function companyStats(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'branch_id' => 'nullable',
            'branch_ids' => 'nullable',
            'department_ids' => 'nullable',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
        ]);

        $companyId = (int) $request->company_id;
        $branchIds = array_values(array_unique(array_merge(
            $this->normalizeIds($request->input('branch_ids')),
            $this->normalizeIds($request->input('branch_id'))
        )));
        $departmentIds = $this->normalizeIds($request->input('department_ids'));

        $employeeQuery = Employee::query()->where('company_id', $companyId)->where("status", 1);

        $shiftTypeIds = [1, 3, 4, 6];

        if (request("shift_type_id", 0) > 0) {
            $shiftTypeIds = [request("shift_type_id")];
        }

        $employeeQuery->whereHas('schedule', function ($q) use ($companyId, $shiftTypeIds) {
            $q->where('company_id', $companyId);
            $q->whereIn("shift_type_id", $shiftTypeIds);
        });



        if (!empty($branchIds)) {
            $employeeQuery->whereIn('branch_id', $branchIds);
        }

        if (!empty($departmentIds)) {
            $employeeQuery->whereIn('department_id', $departmentIds);
        }

        $employeeSystemUserIds = $employeeQuery->pluck('system_user_id')->filter()->values();

        $now = Carbon::now();
        $selectedStart = $request->filled('from_date')
            ? Carbon::parse($request->input('from_date'))->startOfDay()
            : $now->copy()->startOfMonth()->startOfDay();
        $selectedEnd = $request->filled('to_date')
            ? Carbon::parse($request->input('to_date'))->endOfDay()
            : $now->copy()->endOfDay();

        if ($selectedEnd->lt($selectedStart)) {
            $selectedEnd = $selectedStart->copy()->endOfDay();
        }

        $currentStart = $selectedStart->toDateString();
        $currentEnd = $selectedEnd->toDateString();

        $daysElapsed = max(1, $selectedStart->copy()->diffInDays($selectedEnd) + 1);
        $previousEndDate = $selectedStart->copy()->subDay();
        $previousStartDate = $previousEndDate->copy()->subDays($daysElapsed - 1);
        $previousStart = $previousStartDate->toDateString();
        $previousEnd = $previousEndDate->toDateString();

        $attendanceCurrent = Attendance::query()
            ->where('company_id', $companyId)
            ->whereIn('employee_id', $employeeSystemUserIds)
            ->whereBetween('date', [$currentStart, $currentEnd]);


        $shiftTypeIds = [1, 3, 4, 6];

        if (request("shift_type_id", 0) > 0) {
            $shiftTypeIds = [request("shift_type_id")];
        }

        $attendanceCurrent->whereIn('shift_type_id', $shiftTypeIds);

        $attendancePrevious = Attendance::query()
            ->where('company_id', $companyId)
            ->whereIn('employee_id', $employeeSystemUserIds)
            ->whereBetween('date', [$previousStart, $previousEnd])
            ->whereIn('shift_type_id', $shiftTypeIds);

        $totalStaff = $employeeQuery->count();
        $previousTotalStaff = $totalStaff;

        $presentCount = (clone $attendanceCurrent)->where('status', 'P')->count();
        $totalAttendanceRows = (clone $attendanceCurrent)->whereNotIn('status', ['---'])->count();
        $attendancePercent = $totalAttendanceRows > 0 ? round(($presentCount / $totalAttendanceRows) * 100, 1) : 0;

        $previousPresentCount = (clone $attendancePrevious)->where('status', 'P')->count();
        $previousAttendanceRows = (clone $attendancePrevious)->whereNotIn('status', ['---'])->count();
        $previousAttendancePercent = $previousAttendanceRows > 0 ? round(($previousPresentCount / $previousAttendanceRows) * 100, 1) : 0;

        $currentOvertimeMinutes = $this->sumDurationMinutes((clone $attendanceCurrent)->pluck('ot')->toArray());
        $previousOvertimeMinutes = $this->sumDurationMinutes((clone $attendancePrevious)->pluck('ot')->toArray());

        $lateInCount = (clone $attendanceCurrent)->where('late_coming', '!=', '---')->count();
        $previousLateInCount = (clone $attendancePrevious)->where('late_coming', '!=', '---')->count();

        $earlyOutCount = (clone $attendanceCurrent)->where('early_going', '!=', '---')->count();
        $previousEarlyOutCount = (clone $attendancePrevious)->where('early_going', '!=', '---')->count();

        $avgWorkMinutes = $this->avgDurationMinutes((clone $attendanceCurrent)->where('total_hrs', '!=', '---')->pluck('total_hrs')->toArray());
        $previousAvgWorkMinutes = $this->avgDurationMinutes((clone $attendancePrevious)->where('total_hrs', '!=', '---')->pluck('total_hrs')->toArray());

        $absentCount = (clone $attendanceCurrent)->where('status', 'A')->count();
        $previousAbsentCount = (clone $attendancePrevious)->where('status', 'A')->count();

        $leaveCount = (clone $attendanceCurrent)->where('status', 'L')->count();
        $previousLeaveCount = (clone $attendancePrevious)->where('status', 'L')->count();

        $manualPunchCount = (clone $attendanceCurrent)->where('is_manual_entry', true)->count();
        $previousManualPunchCount = (clone $attendancePrevious)->where('is_manual_entry', true)->count();

        return response()->json([
            'stats' => [
                [
                    'title' => 'Total Staff',
                    'value' => (string) $totalStaff,
                    'icon' => 'groups',
                    'color' => 'blue',
                    'trend' => $this->formatTrend($this->trendPercent($totalStaff, $previousTotalStaff)),
                    'trendUp' => $totalStaff >= $previousTotalStaff,
                    'subText' => 'Active members',
                    'type' => 'sparkline',
                    'path' => 'M0 20 C 20 25, 40 10, 60 15 C 80 20, 90 5, 100 10',
                ],
                [
                    'title' => 'Attendance',
                    'value' => number_format($attendancePercent, 1) . '%',
                    'icon' => 'donut_large',
                    'color' => 'emerald',
                    'trend' => $this->formatTrend($this->trendPercent($attendancePercent, $previousAttendancePercent)),
                    'trendUp' => $attendancePercent >= $previousAttendancePercent,
                    'type' => 'progress',
                    'progress' => number_format($attendancePercent, 1) . '%',
                ],
                [
                    'title' => 'Overtime',
                    'value' => $this->minutesToHoursLabel($currentOvertimeMinutes),
                    'icon' => 'schedule',
                    'color' => 'purple',
                    'trend' => $this->formatTrend($this->trendPercent($currentOvertimeMinutes, $previousOvertimeMinutes)),
                    'trendUp' => $currentOvertimeMinutes <= $previousOvertimeMinutes,
                    'subText' => 'Monthly total',
                ],
                [
                    'title' => 'Late In',
                    'value' => (string) $lateInCount,
                    'icon' => 'warning',
                    'color' => 'orange',
                    'trend' => $this->formatTrend($this->trendPercent($lateInCount, $previousLateInCount)),
                    'trendUp' => $lateInCount <= $previousLateInCount,
                    'type' => 'progress',
                    'progress' => $totalAttendanceRows > 0 ? number_format(($lateInCount / $totalAttendanceRows) * 100, 1) . '%' : '0%',
                ],
                [
                    'title' => 'Early Out',
                    'value' => (string) $earlyOutCount,
                    'icon' => 'logout',
                    'color' => 'orange',
                    'trend' => $this->formatTrend($this->trendPercent($earlyOutCount, $previousEarlyOutCount)),
                    'trendUp' => $earlyOutCount <= $previousEarlyOutCount,
                    'subText' => 'Unplanned',
                ],
                [
                    'title' => 'Avg Work Hrs',
                    'value' => $this->minutesToHoursLabel($avgWorkMinutes, 1),
                    'icon' => 'timelapse',
                    'color' => 'blue',
                    'trend' => $this->formatTrend($this->trendPercent($avgWorkMinutes, $previousAvgWorkMinutes)),
                    'trendUp' => $avgWorkMinutes >= $previousAvgWorkMinutes,
                    'subText' => 'Daily average',
                ],
                [
                    'title' => 'Absent',
                    'value' => (string) $absentCount,
                    'icon' => 'person_off',
                    'color' => 'emerald',
                    'trend' => $this->formatTrend($this->trendPercent($absentCount, $previousAbsentCount)),
                    'trendUp' => $absentCount <= $previousAbsentCount,
                    'subText' => 'Unexcused',
                ],
                [
                    'title' => 'Leave',
                    'value' => (string) $leaveCount,
                    'icon' => 'flight_takeoff',
                    'color' => 'emerald',
                    'trend' => $this->formatTrend($this->trendPercent($leaveCount, $previousLeaveCount)),
                    'trendUp' => $leaveCount <= $previousLeaveCount,
                    'subText' => 'Approved',
                ],
                [
                    'title' => 'Manual Punch',
                    'value' => (string) $manualPunchCount,
                    'icon' => 'pan_tool',
                    'color' => 'purple',
                    'trend' => $this->formatTrend($this->trendPercent($manualPunchCount, $previousManualPunchCount)),
                    'trendUp' => $manualPunchCount <= $previousManualPunchCount,
                    'subText' => 'Corrections',
                ],
            ],
            'filters' => [
                'company_id' => $companyId,
                'branch_ids' => $branchIds,
                'department_ids' => $departmentIds,
                'range' => [
                    'from' => $currentStart,
                    'to' => $currentEnd,
                ],
            ],
            // 'top_3_punctual' => $top3Punctual,
            // 'top_3_absent_late' => $top3AbsentLate,
        ]);
    }

    public function companyStatsHourlyTrends(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'branch_id' => 'nullable',
            'branch_ids' => 'nullable',
            'department_ids' => 'nullable',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
        ]);

        $companyId = (int) $request->company_id;
        $branchIds = array_values(array_unique(array_merge(
            $this->normalizeIds($request->input('branch_ids')),
            $this->normalizeIds($request->input('branch_id'))
        )));
        $departmentIds = $this->normalizeIds($request->input('department_ids'));

        $employeeQuery = Employee::query()->where('company_id', $companyId);

        if (!empty($branchIds)) {
            $employeeQuery->whereIn('branch_id', $branchIds);
        }

        if (!empty($departmentIds)) {
            $employeeQuery->whereIn('department_id', $departmentIds);
        }

        $employeeSystemUserIds = $employeeQuery->pluck('system_user_id')->filter()->values();

        $now = Carbon::now();
        $selectedStart = $request->filled('from_date')
            ? Carbon::parse($request->input('from_date'))->startOfDay()
            : $now->copy()->startOfMonth()->startOfDay();
        $selectedEnd = $request->filled('to_date')
            ? Carbon::parse($request->input('to_date'))->endOfDay()
            : $now->copy()->endOfDay();

        if ($selectedEnd->lt($selectedStart)) {
            $selectedEnd = $selectedStart->copy()->endOfDay();
        }

        $currentStart = $selectedStart->toDateString();
        $currentEnd = $selectedEnd->toDateString();

        $hourlyData = [];
        for ($hour = 0; $hour < 24; $hour++) {
            $label = str_pad((string) $hour, 2, '0', STR_PAD_LEFT) . ':00';
            $hourlyData[$hour] = [
                'label' => $label,
                'punches' => 0,
            ];
        }

        if ($employeeSystemUserIds->isNotEmpty()) {
            $attendanceRows = Attendance::query()
                ->where('company_id', $companyId)
                ->whereIn('employee_id', $employeeSystemUserIds)
                ->whereBetween('date', [$currentStart, $currentEnd])
                ->whereNotNull('in')
                ->where('in', '!=', '---')
                ->get(['in']);

            foreach ($attendanceRows as $row) {
                $hour = $this->resolveAttendanceHour($row->in ?? null);
                $hourlyData[$hour]['punches']++;
            }
        }

        return response()->json([
            'data' => array_values($hourlyData),
            'filters' => [
                'company_id' => $companyId,
                'branch_ids' => $branchIds,
                'department_ids' => $departmentIds,
                'range' => [
                    'from' => $currentStart,
                    'to' => $currentEnd,
                ],
            ],
        ]);
    }

    public function companyStatsDayTrends(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'branch_id' => 'nullable',
            'branch_ids' => 'nullable',
            'department_ids' => 'nullable',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
        ]);

        $companyId = (int) $request->company_id;
        $branchIds = array_values(array_unique(array_merge(
            $this->normalizeIds($request->input('branch_ids')),
            $this->normalizeIds($request->input('branch_id'))
        )));
        $departmentIds = $this->normalizeIds($request->input('department_ids'));

        $employeeQuery = Employee::query()->where('company_id', $companyId);

        if (!empty($branchIds)) {
            $employeeQuery->whereIn('branch_id', $branchIds);
        }

        if (!empty($departmentIds)) {
            $employeeQuery->whereIn('department_id', $departmentIds);
        }

        $employeeSystemUserIds = $employeeQuery->pluck('system_user_id')->filter()->values();

        $now = Carbon::now();
        $selectedStart = $request->filled('from_date')
            ? Carbon::parse($request->input('from_date'))->startOfDay()
            : $now->copy()->startOfMonth()->startOfDay();
        $selectedEnd = $request->filled('to_date')
            ? Carbon::parse($request->input('to_date'))->endOfDay()
            : $now->copy()->endOfDay();

        if ($selectedEnd->lt($selectedStart)) {
            $selectedEnd = $selectedStart->copy()->endOfDay();
        }

        $currentStart = $selectedStart->toDateString();
        $currentEnd = $selectedEnd->toDateString();

        // Build day-by-day buckets
        $dayData = [];
        $cursor = Carbon::parse($currentStart);
        $endDate = Carbon::parse($currentEnd);
        while ($cursor->lte($endDate)) {
            $dateKey = $cursor->toDateString();
            $dayData[$dateKey] = [
                'label' => $cursor->format('d M'),
                'date' => $dateKey,
                'present' => 0,
                'absent' => 0,
            ];
            $cursor->addDay();
        }

        if ($employeeSystemUserIds->isNotEmpty()) {
            $attendanceRows = Attendance::query()
                ->where('company_id', $companyId)
                ->whereIn('employee_id', $employeeSystemUserIds)
                ->whereBetween('date', [$currentStart, $currentEnd])
                ->get(['status', 'date']);

            foreach ($attendanceRows as $row) {
                $dateKey = Carbon::parse($row->date)->toDateString();
                if (!isset($dayData[$dateKey])) {
                    continue;
                }

                $status = strtoupper((string) ($row->status ?? ''));

                if ($status === 'A') {
                    $dayData[$dateKey]['absent']++;
                } elseif ($status === 'P') {
                    $dayData[$dateKey]['present']++;
                }
            }
        }

        return response()->json([
            'data' => array_values($dayData),
            'filters' => [
                'company_id' => $companyId,
                'branch_ids' => $branchIds,
                'department_ids' => $departmentIds,
                'range' => [
                    'from' => $currentStart,
                    'to' => $currentEnd,
                ],
            ],
        ]);
    }

    public function companyStatsDepartmentBreakdown(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'branch_id' => 'nullable',
            'branch_ids' => 'nullable',
            'department_ids' => 'nullable',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
        ]);

        $companyId = (int) $request->company_id;
        $branchIds = array_values(array_unique(array_merge(
            $this->normalizeIds($request->input('branch_ids')),
            $this->normalizeIds($request->input('branch_id'))
        )));
        $departmentIds = $this->normalizeIds($request->input('department_ids'));

        $now = Carbon::now();
        $selectedStart = $request->filled('from_date')
            ? Carbon::parse($request->input('from_date'))->startOfDay()
            : $now->copy()->startOfMonth()->startOfDay();
        $selectedEnd = $request->filled('to_date')
            ? Carbon::parse($request->input('to_date'))->endOfDay()
            : $now->copy()->endOfDay();

        if ($selectedEnd->lt($selectedStart)) {
            $selectedEnd = $selectedStart->copy()->endOfDay();
        }

        $currentStart = $selectedStart->toDateString();
        $currentEnd = $selectedEnd->toDateString();

        $rows = Attendance::query()
            ->join('employees', function ($join) use ($companyId) {
                $join->on('employees.system_user_id', '=', 'attendances.employee_id')
                    ->where('employees.company_id', '=', $companyId);
            })
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->where('attendances.company_id', $companyId)
            ->whereBetween('attendances.date', [$currentStart, $currentEnd])
            ->whereNotIn('attendances.status', ['---'])
            ->when(!empty($branchIds), fn($q) => $q->whereIn('employees.branch_id', $branchIds))
            ->when(!empty($departmentIds), fn($q) => $q->whereIn('employees.department_id', $departmentIds))
            ->selectRaw("COALESCE(departments.name, 'Unknown') as name, COUNT(*) as total")
            ->groupByRaw("COALESCE(departments.name, 'Unknown')")
            ->orderByDesc('total')
            ->get();

        $grandTotal = (int) $rows->sum('total');

        $data = $rows->map(function ($row) use ($grandTotal) {
            $count = (int) $row->total;
            $percentage = $grandTotal > 0 ? round(($count / $grandTotal) * 100, 1) : 0;

            return [
                'name' => (string) $row->name,
                'count' => $count,
                'percentage' => $percentage,
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'filters' => [
                'company_id' => $companyId,
                'branch_ids' => $branchIds,
                'department_ids' => $departmentIds,
                'range' => [
                    'from' => $currentStart,
                    'to' => $currentEnd,
                ],
            ],
        ]);
    }

    public function companyStatsPunctuality(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'branch_id' => 'nullable',
            'branch_ids' => 'nullable',
            'department_ids' => 'nullable',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
        ]);

        $companyId = (int) $request->company_id;
        $branchIds = array_values(array_unique(array_merge(
            $this->normalizeIds($request->input('branch_ids')),
            $this->normalizeIds($request->input('branch_id'))
        )));
        $departmentIds = $this->normalizeIds($request->input('department_ids'));

        $now = Carbon::now();
        $selectedStart = $request->filled('from_date')
            ? Carbon::parse($request->input('from_date'))->startOfDay()
            : $now->copy()->startOfMonth()->startOfDay();
        $selectedEnd = $request->filled('to_date')
            ? Carbon::parse($request->input('to_date'))->endOfDay()
            : $now->copy()->endOfDay();

        if ($selectedEnd->lt($selectedStart)) {
            $selectedEnd = $selectedStart->copy()->endOfDay();
        }

        $currentStart = $selectedStart->toDateString();
        $currentEnd = $selectedEnd->toDateString();

        $employeeQuery = Employee::query()->where('company_id', $companyId);
        if (!empty($branchIds)) {
            $employeeQuery->whereIn('branch_id', $branchIds);
        }
        if (!empty($departmentIds)) {
            $employeeQuery->whereIn('department_id', $departmentIds);
        }

        $employeeIds = $employeeQuery->pluck('system_user_id')->filter()->values();

        if ($employeeIds->isEmpty()) {
            return response()->json([
                'data' => [],
                'filters' => [
                    'company_id' => $companyId,
                    'branch_ids' => $branchIds,
                    'department_ids' => $departmentIds,
                    'range' => [
                        'from' => $currentStart,
                        'to' => $currentEnd,
                    ],
                ],
            ]);
        }

        $rows = Attendance::query()
            ->where('company_id', $companyId)
            ->whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$currentStart, $currentEnd])
            ->selectRaw("employee_id,
                SUM(CASE WHEN status != '---' THEN 1 ELSE 0 END) as total_days,
                SUM(CASE WHEN status = 'P' AND late_coming = '---' THEN 1 ELSE 0 END) as punctual_days")
            ->groupBy('employee_id')
            ->havingRaw("SUM(CASE WHEN status != '---' THEN 1 ELSE 0 END) > 0")
            ->havingRaw("SUM(CASE WHEN status = 'P' AND late_coming = '---' THEN 1 ELSE 0 END) > 0")
            ->orderByDesc('punctual_days')
            ->limit(10)
            ->get();

        $employeeMap = Employee::query()
            ->where('company_id', $companyId)
            ->whereIn('system_user_id', $rows->pluck('employee_id')->toArray())
            ->with(['department'])
            ->get(['system_user_id', 'first_name', 'last_name', 'display_name', 'profile_picture', 'department_id'])
            ->keyBy('system_user_id');

        $data = $rows->map(function ($row) use ($employeeMap) {
            $employee = $employeeMap->get((int) $row->employee_id);
            $totalDays = (int) $row->total_days;
            $punctualDays = (int) $row->punctual_days;
            $score = $totalDays > 0 ? round(($punctualDays / $totalDays) * 100, 1) : 0;

            $name = trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? ''));
            if ($name === '') {
                $name = (string) ($employee?->display_name ?? 'Unknown');
            }

            return [
                'system_user_id' => (int) $row->employee_id,
                'name' => $name,
                'dept' => (string) ($employee?->department?->name ?? '---'),
                'score' => number_format($score, 1) . '%',
                'score_value' => $score,
                'img' => $employee?->profile_picture ?: null,
                'punctual_days' => $punctualDays,
                'total_days' => $totalDays,
            ];
        })
            ->filter(fn($item) => $item['score_value'] > 0)
            ->sortByDesc('score_value')
            ->take(3)
            ->values();

        return response()->json([
            'data' => $data,
            'filters' => [
                'company_id' => $companyId,
                'branch_ids' => $branchIds,
                'department_ids' => $departmentIds,
                'range' => [
                    'from' => $currentStart,
                    'to' => $currentEnd,
                ],
            ],
        ]);
    }

    public function companyStatsDailyAttendance(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'branch_id' => 'nullable',
            'branch_ids' => 'nullable',
            'department_ids' => 'nullable',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'search' => 'nullable|string',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:500',
        ]);

        $companyId = (int) $request->company_id;


        $shiftTypeIds = [1, 3, 4, 6];

        if (request("shift_type_id", 0) > 0) {
            $shiftTypeIds = [request("shift_type_id")];
        }

        $branchIds = array_values(array_unique(array_merge(
            $this->normalizeIds($request->input('branch_ids')),
            $this->normalizeIds($request->input('branch_id'))
        )));
        $departmentIds = $this->normalizeIds($request->input('department_ids'));
        $search = trim((string) $request->input('search', ''));
        $normalizedSearch = strtolower($search);
        $page = max(1, (int) $request->input('page', 1));
        $perPage = max(1, min(500, (int) $request->input('per_page', 10)));

        $now = Carbon::now();
        $selectedStart = $request->filled('from_date')
            ? Carbon::parse($request->input('from_date'))->startOfDay()
            : $now->copy()->startOfMonth()->startOfDay();

        $selectedEnd = $request->filled('to_date')
            ? Carbon::parse($request->input('to_date'))->endOfDay()
            : $now->copy()->endOfDay();

        if ($selectedEnd->lt($selectedStart)) {
            $selectedEnd = $selectedStart->copy()->endOfDay();
        }

        $currentStart = $selectedStart->toDateString();
        $currentEnd = $selectedEnd->toDateString();
        $isSingleDay = $currentStart === $currentEnd;

        $daysElapsed = max(1, $selectedStart->copy()->diffInDays($selectedEnd) + 1);
        $previousEndDate = $selectedStart->copy()->subDay();
        $previousStartDate = $previousEndDate->copy()->subDays($daysElapsed - 1);
        $previousStart = $previousStartDate->toDateString();
        $previousEnd = $previousEndDate->toDateString();

        $baseQuery = Attendance::query()
            ->whereIn('shift_type_id', $shiftTypeIds)
            ->join('employees', function ($join) use ($companyId) {
                $join->on('employees.system_user_id', '=', 'attendances.employee_id')
                    ->where('employees.company_id', '=', $companyId)
                    ->where('employees.status', 1); // Add this line
            })
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->where('attendances.company_id', $companyId)
            ->whereBetween('attendances.date', [$currentStart, $currentEnd])
            ->when(!empty($branchIds), fn($q) => $q->whereIn('employees.branch_id', $branchIds))
            ->when(!empty($departmentIds), fn($q) => $q->whereIn('employees.department_id', $departmentIds))
            ->when($normalizedSearch !== '', function ($q) use ($normalizedSearch) {
                $q->where(function ($query) use ($normalizedSearch) {
                    $query->whereRaw('LOWER(employees.first_name) LIKE ?', ["%{$normalizedSearch}%"])
                        ->orWhereRaw('LOWER(employees.last_name) LIKE ?', ["%{$normalizedSearch}%"])
                        ->orWhereRaw('LOWER(employees.display_name) LIKE ?', ["%{$normalizedSearch}%"])
                        ->orWhereRaw('LOWER(employees.employee_id) LIKE ?', ["%{$normalizedSearch}%"]);
                });
            });


        $shiftTypeIds = [1, 3, 4, 6];

        if (request("shift_type_id", 0) > 0) {
            $shiftTypeIds = [request("shift_type_id")];
        }

        $baseQuery->whereIn('shift_type_id', $shiftTypeIds);

        $baseQuery->whereHas('employee.schedule', function ($q) use ($companyId, $shiftTypeIds) {
            $q->where('company_id', $companyId);
            $q->whereIn("shift_type_id", $shiftTypeIds);
        });


        if ($isSingleDay) {
            $baseQuery
                ->with([
                    'shift' => function ($q) use ($companyId) {
                        $q->where('company_id', $companyId)
                            ->select('id', 'company_id', 'name', 'on_duty_time', 'off_duty_time');
                    },
                    'device_in:device_id,name',
                    'device_out:device_id,name',
                    'employee:system_user_id,profile_picture',
                ])

                ->selectRaw("
                attendances.id,
                attendances.date,
                attendances.shift_type_id,
                attendances.shift_id,
                attendances.employee_id,
                employees.system_user_id,
                employees.employee_id as employee_code,
                employees.first_name,
                employees.last_name,
                employees.display_name,
                attendances.device_id_in,
                attendances.device_id_out,
                employees.profile_picture,
                COALESCE(departments.name, '---') as department_name,
                attendances.date,
                attendances.logs,
                COALESCE(attendances.in, '---') as in_time,
                COALESCE(attendances.out, '---') as out_time,
                COALESCE(attendances.late_coming, '---') as late_in,
                COALESCE(attendances.early_going, '---') as early_out,
                COALESCE(attendances.ot, '---') as ot,
                COALESCE(attendances.total_hrs, '---') as total_hrs,
                COALESCE(attendances.status, '---') as attendance_status
            ");

            $total = (clone $baseQuery)->count();

            $lastPage = max(1, (int) ceil($total / $perPage));
            $page = min($page, $lastPage);

            $rows = (clone $baseQuery)
                ->orderBy('employees.first_name')
                ->forPage($page, $perPage)
                ->get();

            $data = $rows->map(function ($row) {
                $name = trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? ''));
                if ($name === '') {
                    $name = (string) ($row->display_name ?? 'Unknown');
                }

                $img = $row->employee?->profile_picture;
                if (empty($img) && !empty($row->profile_picture)) {
                    if (filter_var($row->profile_picture, FILTER_VALIDATE_URL)) {
                        $img = $row->profile_picture;
                    } else {
                        $img = 'https://backend.mytime2cloud.com/media/employee/profile_picture/' . ltrim($row->profile_picture, '/');
                    }
                }

                return [
                    'system_user_id' => (int) $row->system_user_id,
                    'employee_code' => (string) ($row->employee_code ?? ''),
                    'date' => (string) ($row->date ?? ''),
                    'name' => $name,
                    'department' => (string) ($row->department_name ?? '---'),
                    'date' => (string) ($row->date ?? '---'),
                    'shift_id' => (int) ($row->shift_id ?? 0),
                    'shift_type_id' => (int) ($row->shift_type_id ?? 0),
                    'shift_name' => (string) ($row->shift?->name ?? '---'),
                    'on_duty_time' => (string) ($row->shift?->on_duty_time ?? '---'),
                    'off_duty_time' => (string) ($row->shift?->off_duty_time ?? '---'),
                    'device_in' => (string) ($row->device_in?->name ?? '---'),
                    'device_out' => (string) ($row->device_out?->name ?? '---'),
                    'logs' => $row->logs ?? [],
                    'in' => (string) ($row->in_time ?? '---'),
                    'out' => (string) ($row->out_time ?? '---'),
                    'late_in' => (string) ($row->late_in ?? '---'),
                    'early_out' => (string) ($row->early_out ?? '---'),
                    'ot' => (string) ($row->ot ?? '---'),
                    'total_hrs' => (string) ($row->total_hrs ?? '---'),
                    'status' => (string) ($row->attendance_status ?? '---'),
                    'img' => $img,
                ];
            })->values();
        } else {
            $baseQuery->selectRaw("
            employees.system_user_id,
            employees.employee_id as employee_code,
            employees.first_name,
            employees.last_name,
            employees.display_name,
            employees.profile_picture,
            COALESCE(departments.name, '---') as department_name,
            SUM(CASE WHEN attendances.status IN ('P', 'LC', 'EG', 'ME') THEN 1 ELSE 0 END) as days_present,
            SUM(CASE WHEN attendances.status = 'A' THEN 1 ELSE 0 END) as days_absent,
            SUM(CASE WHEN attendances.status = 'L' THEN 1 ELSE 0 END) as days_leave,
            SUM(CASE WHEN attendances.status = 'O' THEN 1 ELSE 0 END) as days_weekoff,
            SUM(CASE WHEN attendances.status = 'M' THEN 1 ELSE 0 END) as days_missing,
            SUM(CASE WHEN attendances.status = 'ME' THEN 1 ELSE 0 END) as manual_logs,
            SUM(CASE WHEN attendances.status != '---' THEN 1 ELSE 0 END) as total_days,
            " . $this->buildSumMinutesSelect('attendances.late_coming', 'late_in_minutes') . ",
            " . $this->buildSumMinutesSelect('attendances.early_going', 'early_out_minutes') . ",
            " . $this->buildAvgTimeSelect('attendances.in', 'avg_checkin_minutes') . ",
            " . $this->buildAvgTimeSelect('attendances.out', 'avg_checkout_minutes') . ",
            " . $this->buildSumDurationSelect('attendances.total_hrs', 'total_working_minutes') . "
        ")
                ->groupBy(
                    'employees.system_user_id',
                    'employees.employee_id',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.display_name',
                    'employees.profile_picture',
                    'departments.name'
                )
                ->havingRaw("SUM(CASE WHEN attendances.status != '---' THEN 1 ELSE 0 END) > 0");

            $total = DB::query()
                ->fromSub((clone $baseQuery)->toBase(), 'attendance_summary')
                ->count();

            $lastPage = max(1, (int) ceil($total / $perPage));
            $page = min($page, $lastPage);

            $rows = (clone $baseQuery)
                ->orderByDesc('days_present')
                ->orderBy('employees.first_name')
                ->forPage($page, $perPage)
                ->get();

            $employeeIds = $rows->pluck('system_user_id')->filter()->values();

            $previousSummary = Attendance::query()
                ->where('company_id', $companyId)
                ->whereIn('employee_id', $employeeIds)
                ->whereBetween('date', [$previousStart, $previousEnd])
                ->selectRaw("
                employee_id,
                SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) as prev_days_present,
                SUM(CASE WHEN status != '---' THEN 1 ELSE 0 END) as prev_total_days
            ")
                ->groupBy('employee_id')
                ->get()
                ->keyBy('employee_id');

            $data = $rows->map(function ($row) use ($previousSummary, $isSingleDay) {
                $name = trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? ''));
                if ($name === '') {
                    $name = (string) ($row->display_name ?? 'Unknown');
                }

                $daysPresent = (int) ($row->days_present ?? 0);
                $daysAbsent = (int) ($row->days_absent ?? 0);
                $daysLeave = (int) ($row->days_leave ?? 0);
                $daysWeekoff = (int) ($row->days_weekoff ?? 0);
                $daysMissing = (int) ($row->days_missing ?? 0);
                $manualLogs = (int) ($row->manual_logs ?? 0);
                $totalDays = (int) ($row->total_days ?? 0);
                $lateInMinutes = (int) ($row->late_in_minutes ?? 0);
                $earlyOutMinutes = (int) ($row->early_out_minutes ?? 0);
                $rate = $totalDays > 0 ? round(($daysPresent / $totalDays) * 100, 1) : 0;

                $avgCheckinMin = (float) ($row->avg_checkin_minutes ?? 0);
                $avgCheckoutMin = (float) ($row->avg_checkout_minutes ?? 0);
                $totalWorkingMin = (int) ($row->total_working_minutes ?? 0);

                $avgCheckin = $avgCheckinMin > 0
                    ? sprintf('%02d:%02d', floor($avgCheckinMin / 60), $avgCheckinMin % 60)
                    : '---';

                $avgCheckout = $avgCheckoutMin > 0
                    ? sprintf('%02d:%02d', floor($avgCheckoutMin / 60), $avgCheckoutMin % 60)
                    : '---';

                $avgWorkingMinPerDay = $daysPresent > 0 ? round($totalWorkingMin / $daysPresent) : 0;
                $avgWorkingHrs = $avgWorkingMinPerDay > 0
                    ? sprintf('%d:%02d', floor($avgWorkingMinPerDay / 60), $avgWorkingMinPerDay % 60)
                    : '---';

                $totalHours = (int) floor($totalWorkingMin / 60);
                $totalMinutes = (int) ($totalWorkingMin % 60);
                $totalHoursFormatted = $totalWorkingMin > 0
                    ? sprintf('%02d:%02d', $totalHours, $totalMinutes)
                    : '---';

                $standardHoursPerDay = 10;
                $requiredHours = $totalDays * $standardHoursPerDay;
                $requiredHoursFormatted = $requiredHours > 0
                    ? sprintf('%02d:00', $requiredHours)
                    : '---';

                $prev = $previousSummary->get((int) $row->system_user_id);
                $prevPresent = (int) ($prev->prev_days_present ?? 0);
                $prevTotal = (int) ($prev->prev_total_days ?? 0);
                $prevRate = $prevTotal > 0 ? round(($prevPresent / $prevTotal) * 100, 1) : 0;
                $trend = round($rate - $prevRate, 1);

                $status = 'CRITICAL';
                if ($rate >= 90) {
                    $status = 'GOOD';
                } elseif ($rate >= 75) {
                    $status = 'WARNING';
                }

                $img = null;
                if (!empty($row->profile_picture)) {
                    $pp = $row->profile_picture;
                    if (filter_var($pp, FILTER_VALIDATE_URL)) {
                        $img = $pp;
                    } elseif (file_exists(public_path('media/employee/profile_picture/' . $pp))) {
                        $img = asset('media/employee/profile_picture/' . $pp);
                    } else {
                        $img = 'https://backend.mytime2cloud.com/media/employee/profile_picture/' . ltrim($pp, '/');
                    }
                }

                $lateInHours = $lateInMinutes > 0
                    ? sprintf('%d:%02d', floor($lateInMinutes / 60), $lateInMinutes % 60)
                    : '---';

                $earlyOutHours = $earlyOutMinutes > 0
                    ? sprintf('%d:%02d', floor($earlyOutMinutes / 60), $earlyOutMinutes % 60)
                    : '---';

                return [
                    'system_user_id' => (int) $row->system_user_id,
                    'employee_code' => (string) ($row->employee_code ?? ''),
                    'name' => $name,
                    'department' => (string) ($row->department_name ?? '---'),
                    'days_present' => $daysPresent,
                    'days_absent' => $daysAbsent,
                    'days_leave' => $daysLeave,
                    'days_weekoff' => $daysWeekoff,
                    'days_missing' => $daysMissing,
                    'manual_logs' => $manualLogs,
                    'total_days' => $totalDays,
                    'late_in_hours' => $lateInHours,
                    'early_out_hours' => $earlyOutHours,
                    'avg_checkin' => $avgCheckin,
                    'avg_checkout' => $avgCheckout,
                    'avg_working_hrs' => $avgWorkingHrs,
                    'total_hours' => $totalHoursFormatted,
                    'required_hours' => $requiredHoursFormatted,
                    'rate' => $rate,
                    'trend' => $trend,
                    'status' => $isSingleDay ? $row->status : $status,
                    'img' => $img,
                ];
            })->values();
        }

        return response()->json([
            'report_type' => $isSingleDay ? 'daily' : 'range',
            'data' => $data,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage,
                'from' => $total > 0 ? (($page - 1) * $perPage) + 1 : 0,
                'to' => $total > 0 ? (($page - 1) * $perPage) + $data->count() : 0,
            ],
            'filters' => [
                'company_id' => $companyId,
                'branch_ids' => $branchIds,
                'department_ids' => $departmentIds,
                'range' => [
                    'from' => $currentStart,
                    'to' => $currentEnd,
                ],
                'search' => $search,
                'page' => $page,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function companyStatsSummaryPayload(Request $request)
    {
        $request->merge([
            'company_id' => $request->input('company_id', $request->input('companyId')),
            'shift_type_id' => $request->input('shift_type_id', $request->input('shift_type_id')),
            'branch_id' => $request->input('branch_id', $request->input('branchId')),
            'branch_ids' => $request->input('branch_ids', $request->input('branchIds')),
            'department_ids' => $request->input('department_ids', $request->input('departmentIds')),
            'from_date' => $request->input('from_date', $request->input('fromDate')),
            'to_date' => $request->input('to_date', $request->input('toDate')),
            'absent_threshold' => $request->input('absent_threshold', $request->input('absentThreshold')),
            'late_threshold' => $request->input('late_threshold', $request->input('lateThreshold')),
            'per_page' => $request->input('per_page', $request->input('perPage')),
        ]);

        $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'branch_id' => 'nullable',
            'shift_type_id' => 'nullable',
            'branch_ids' => 'nullable',
            'department_ids' => 'nullable',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'search' => 'nullable|string',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:1000',
            'absent_threshold' => 'nullable|numeric|min:0|max:100',
            'late_threshold' => 'nullable|integer|min:1',
        ]);

        $companyId = (int) $request->company_id;
        $branchIds = array_values(array_unique(array_merge(
            $this->normalizeIds($request->input('branch_ids')),
            $this->normalizeIds($request->input('branch_id'))
        )));
        $departmentIds = $this->normalizeIds($request->input('department_ids'));

        $now = Carbon::now();
        $selectedStart = $request->filled('from_date')
            ? Carbon::parse($request->input('from_date'))->startOfDay()
            : $now->copy()->startOfMonth()->startOfDay();
        $selectedEnd = $request->filled('to_date')
            ? Carbon::parse($request->input('to_date'))->endOfDay()
            : $now->copy()->endOfDay();

        if ($selectedEnd->lt($selectedStart)) {
            $selectedEnd = $selectedStart->copy()->endOfDay();
        }

        $currentStart = $selectedStart->toDateString();
        $currentEnd = $selectedEnd->toDateString();

        $employeeQuery = Employee::query()->where('company_id', $companyId);
        if (!empty($branchIds)) {
            $employeeQuery->whereIn('branch_id', $branchIds);
        }
        if (!empty($departmentIds)) {
            $employeeQuery->whereIn('department_id', $departmentIds);
        }

        $employeeIds = $employeeQuery->pluck('system_user_id')->filter()->values();

        $stats = $this->companyStats($request)->getData(true);
        $hourlyTrends = $this->companyStatsHourlyTrends($request)->getData(true);
        $departmentBreakdown = $this->companyStatsDepartmentBreakdown($request)->getData(true);
        $punctuality = $this->companyStatsPunctuality($request)->getData(true);

        $dailyRequest = clone $request;
        if (!$dailyRequest->filled('per_page')) {
            $dailyRequest->merge(['per_page' => 50]);
        }
        $dailyAttendance = $this->companyStatsDailyAttendance($dailyRequest)->getData(true);

        $absentThreshold = (float) $request->input('absent_threshold', 15);
        $lateThreshold = (int) $request->input('late_threshold', 3);

        $attentionRows = collect();

        if ($employeeIds->isNotEmpty()) {
            $attentionRows = Attendance::query()
                ->where('company_id', $companyId)
                ->whereIn('employee_id', $employeeIds)
                ->whereBetween('date', [$currentStart, $currentEnd])
                ->selectRaw("employee_id,
                    SUM(CASE WHEN status != '---' THEN 1 ELSE 0 END) as total_days,
                    SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent_days,
                    SUM(CASE WHEN late_coming != '---' THEN 1 ELSE 0 END) as late_days")
                ->groupBy('employee_id')
                ->havingRaw("SUM(CASE WHEN status != '---' THEN 1 ELSE 0 END) > 0")
                ->get();
        }

        $employeeMap = Employee::query()
            ->where('company_id', $companyId)
            ->whereIn('system_user_id', $attentionRows->pluck('employee_id')->toArray())
            ->with(['department'])
            ->get(['system_user_id', 'first_name', 'last_name', 'display_name', 'profile_picture', 'department_id'])
            ->keyBy('system_user_id');

        $highAbsenteeism = $attentionRows
            ->map(function ($row) use ($employeeMap) {
                $employee = $employeeMap->get((int) $row->employee_id);
                $totalDays = (int) $row->total_days;
                $absentDays = (int) $row->absent_days;
                $absentRate = $totalDays > 0 ? round(($absentDays / $totalDays) * 100, 1) : 0;

                $name = trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? ''));
                if ($name === '') {
                    $name = (string) ($employee?->display_name ?? 'Unknown');
                }

                return [
                    'system_user_id' => (int) $row->employee_id,
                    'name' => $name,
                    'department' => (string) ($employee?->department?->name ?? '---'),
                    'img' => $employee?->profile_picture ?: null,
                    'absent_days' => $absentDays,
                    'total_days' => $totalDays,
                    'absent_rate' => $absentRate,
                ];
            })
            ->filter(fn($item) => $item['absent_rate'] >= $absentThreshold)
            ->sortByDesc('absent_rate')
            ->take(10)
            ->values();

        $frequentLateIns = $attentionRows
            ->map(function ($row) use ($employeeMap) {
                $employee = $employeeMap->get((int) $row->employee_id);
                $lateDays = (int) $row->late_days;

                $name = trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? ''));
                if ($name === '') {
                    $name = (string) ($employee?->display_name ?? 'Unknown');
                }

                return [
                    'system_user_id' => (int) $row->employee_id,
                    'name' => $name,
                    'department' => (string) ($employee?->department?->name ?? '---'),
                    'img' => $employee?->profile_picture ?: null,
                    'late_days' => $lateDays,
                ];
            })
            ->filter(fn($item) => $item['late_days'] > 0)
            ->sortByDesc('late_days')
            ->filter(fn($item) => $item['late_days'] >= $lateThreshold)
            ->take(10)
            ->values();

        return response()->json([
            'stats' => $stats['stats'] ?? [],
            'hourly_trends' => $hourlyTrends['data'] ?? [],
            'department_breakdown' => $departmentBreakdown['data'] ?? [],
            'punctuality_top' => $punctuality['data'] ?? [],
            'daily_attendance' => $dailyAttendance['data'] ?? [],
            'daily_attendance_meta' => $dailyAttendance['meta'] ?? [
                'total' => 0,
                'page' => 1,
                'per_page' => (int) $dailyRequest->input('per_page', 50),
                'last_page' => 1,
                'from' => 0,
                'to' => 0,
            ],
            'attention_required' => [
                'high_absenteeism' => $highAbsenteeism,
                'frequent_late_ins' => $frequentLateIns,
                'thresholds' => [
                    'absent_rate_percent' => $absentThreshold,
                    'late_ins_count' => $lateThreshold,
                ],
            ],
            'filters' => [
                'company_id' => $companyId,
                'branch_ids' => $branchIds,
                'department_ids' => $departmentIds,
                'range' => [
                    'from' => $currentStart,
                    'to' => $currentEnd,
                ],
                'search' => (string) $dailyRequest->input('search', ''),
                'page' => (int) $dailyRequest->input('page', 1),
                'per_page' => (int) $dailyRequest->input('per_page', 50),
            ],
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    public function companyStatsSummaryPdf(Request $request)
    {
        $request->merge([
            'company_id' => $request->input('company_id', $request->input('companyId')),
            'branch_id' => $request->input('branch_id', $request->input('branchId')),
            'branch_ids' => $request->input('branch_ids', $request->input('branchIds')),
            'department_ids' => $request->input('department_ids', $request->input('departmentIds')),
            'from_date' => $request->input('from_date', $request->input('fromDate')),
            'to_date' => $request->input('to_date', $request->input('toDate')),
            'per_page' => 500,
        ]);

        $request->validate([
            'company_id' => 'required|integer|exists:companies,id',
            'branch_id' => 'nullable',
            'branch_ids' => 'nullable',
            'department_ids' => 'nullable',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
        ]);

        $companyId = (int) $request->company_id;

        $company = \App\Models\Company::find($companyId);
        $companyName = $company?->name ?? 'WorkDay Analytics';

        $now = Carbon::now();
        $selectedStart = $request->filled('from_date')
            ? Carbon::parse($request->input('from_date'))->startOfDay()
            : $now->copy()->startOfMonth()->startOfDay();
        $selectedEnd = $request->filled('to_date')
            ? Carbon::parse($request->input('to_date'))->endOfDay()
            : $now->copy()->endOfDay();

        if ($selectedEnd->lt($selectedStart)) {
            $selectedEnd = $selectedStart->copy()->endOfDay();
        }

        $currentStart = $selectedStart->toDateString();
        $currentEnd = $selectedEnd->toDateString();

        $startMonth = Carbon::parse($currentStart)->format('F Y');
        $endMonth = Carbon::parse($currentEnd)->format('F Y');
        $periodLabel = $startMonth === $endMonth ? $startMonth : "$startMonth - $endMonth";
        $generatedDate = $now->format('F jS, Y');

        $branchIds = array_values(array_unique(array_merge(
            $this->normalizeIds($request->input('branch_ids')),
            $this->normalizeIds($request->input('branch_id'))
        )));
        $departmentIds = $this->normalizeIds($request->input('department_ids'));

        $stats = $this->companyStats($request)->getData(true);
        $dayTrends = $this->companyStatsDayTrends($request)->getData(true);
        $departmentBreakdown = $this->companyStatsDepartmentBreakdown($request)->getData(true);
        $punctuality = $this->companyStatsPunctuality($request)->getData(true);

        $absentThreshold = (float) $request->input('absent_threshold', 15);
        $lateThreshold = (int) $request->input('late_threshold', 3);

        $employeeQuery = Employee::query()->where('company_id', $companyId);
        if (!empty($branchIds)) {
            $employeeQuery->whereIn('branch_id', $branchIds);
        }
        if (!empty($departmentIds)) {
            $employeeQuery->whereIn('department_id', $departmentIds);
        }
        $employeeIds = $employeeQuery->pluck('system_user_id')->filter()->values();

        $attentionRows = collect();
        if ($employeeIds->isNotEmpty()) {
            $attentionRows = Attendance::query()
                ->where('company_id', $companyId)
                ->whereIn('employee_id', $employeeIds)
                ->whereBetween('date', [$currentStart, $currentEnd])
                ->selectRaw("employee_id,
                    SUM(CASE WHEN status != '---' THEN 1 ELSE 0 END) as total_days,
                    SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent_days,
                    SUM(CASE WHEN late_coming != '---' THEN 1 ELSE 0 END) as late_days")
                ->groupBy('employee_id')
                ->havingRaw("SUM(CASE WHEN status != '---' THEN 1 ELSE 0 END) > 0")
                ->get();
        }

        $employeeMap = Employee::query()
            ->where('company_id', $companyId)
            ->whereIn('system_user_id', $attentionRows->pluck('employee_id')->toArray())
            ->with(['department'])
            ->get(['system_user_id', 'first_name', 'last_name', 'display_name', 'profile_picture', 'department_id'])
            ->keyBy('system_user_id');

        $highAbsenteeism = $attentionRows
            ->map(function ($row) use ($employeeMap) {
                $employee = $employeeMap->get((int) $row->employee_id);
                $totalDays = (int) $row->total_days;
                $absentDays = (int) $row->absent_days;
                $absentRate = $totalDays > 0 ? round(($absentDays / $totalDays) * 100, 1) : 0;
                $name = trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? ''));
                if ($name === '') {
                    $name = (string) ($employee?->display_name ?? 'Unknown');
                }
                return [
                    'name' => $name,
                    'department' => (string) ($employee?->department?->name ?? '---'),
                    'img' => $employee?->profile_picture ?: null,
                    'absent_days' => $absentDays,
                    'absent_rate' => $absentRate,
                ];
            })
            ->filter(fn($item) => $item['absent_rate'] >= $absentThreshold)
            ->sortByDesc('absent_rate')
            ->take(5)
            ->values()
            ->toArray();

        $frequentLateIns = $attentionRows
            ->map(function ($row) use ($employeeMap) {
                $employee = $employeeMap->get((int) $row->employee_id);
                $lateDays = (int) $row->late_days;
                $name = trim(($employee?->first_name ?? '') . ' ' . ($employee?->last_name ?? ''));
                if ($name === '') {
                    $name = (string) ($employee?->display_name ?? 'Unknown');
                }
                return [
                    'name' => $name,
                    'department' => (string) ($employee?->department?->name ?? '---'),
                    'img' => $employee?->profile_picture ?: null,
                    'late_days' => $lateDays,
                ];
            })
            ->filter(fn($item) => $item['late_days'] >= $lateThreshold)
            ->sortByDesc('late_days')
            ->take(5)
            ->values()
            ->toArray();

        // Detailed employee statistics for page 2 table
        $detailRows = Attendance::query()
            ->join('employees', function ($join) use ($companyId) {
                $join->on('employees.system_user_id', '=', 'attendances.employee_id')
                    ->where('employees.company_id', '=', $companyId);
            })
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->where('attendances.company_id', $companyId)
            ->whereBetween('attendances.date', [$currentStart, $currentEnd])
            ->when(!empty($branchIds), fn($q) => $q->whereIn('employees.branch_id', $branchIds))
            ->when(!empty($departmentIds), fn($q) => $q->whereIn('employees.department_id', $departmentIds))
            ->selectRaw("
                employees.system_user_id,
                employees.first_name,
                employees.last_name,
                employees.display_name,
                employees.profile_picture,
                COALESCE(departments.name, '---') as department_name,
                SUM(CASE WHEN attendances.status = 'P' THEN 1 ELSE 0 END) as days_present,
                SUM(CASE WHEN attendances.status = 'A' THEN 1 ELSE 0 END) as days_absent,
                SUM(CASE WHEN attendances.status = 'L' THEN 1 ELSE 0 END) as days_leave,
                SUM(CASE WHEN attendances.status = 'ME' THEN 1 ELSE 0 END) as manual_logs,
                SUM(CASE WHEN attendances.status != '---' THEN 1 ELSE 0 END) as total_days,
                SUM(CASE WHEN attendances.late_coming != '---' THEN 1 ELSE 0 END) as late_in_count,
                SUM(CASE WHEN attendances.early_going != '---' THEN 1 ELSE 0 END) as early_out_count,
                " . $this->buildAvgTimeSelect('attendances.in', 'avg_checkin_minutes') . ",
                " . $this->buildAvgTimeSelect('attendances.out', 'avg_checkout_minutes') . ",
                " . $this->buildSumDurationSelect('attendances.total_hrs', 'total_working_minutes') . "
            ")
            ->groupBy(
                'employees.system_user_id',
                'employees.first_name',
                'employees.last_name',
                'employees.display_name',
                'employees.profile_picture',
                'departments.name'
            )
            ->havingRaw("SUM(CASE WHEN attendances.status != '---' THEN 1 ELSE 0 END) > 0")
            ->orderByDesc('days_present')
            ->orderBy('employees.first_name')
            ->limit(500)
            ->get();

        $daysElapsed = max(1, $selectedStart->copy()->diffInDays($selectedEnd) + 1);
        $standardHoursPerDay = 10;
        $requiredHoursBase = $standardHoursPerDay;

        $employeeDetails = $detailRows->map(function ($row) use ($requiredHoursBase) {
            $name = trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? ''));
            if ($name === '') {
                $name = (string) ($row->display_name ?? 'Unknown');
            }

            $daysPresent = (int) ($row->days_present ?? 0);
            $totalDays = (int) ($row->total_days ?? 0);
            $daysAbsent = (int) ($row->days_absent ?? 0);
            $daysLeave = (int) ($row->days_leave ?? 0);
            $manualLogs = (int) ($row->manual_logs ?? 0);
            $lateInCount = (int) ($row->late_in_count ?? 0);
            $earlyOutCount = (int) ($row->early_out_count ?? 0);

            $avgCheckinMin = (float) ($row->avg_checkin_minutes ?? 0);
            $avgCheckoutMin = (float) ($row->avg_checkout_minutes ?? 0);

            $avgCheckin = $avgCheckinMin > 0
                ? sprintf('%02d:%02d', intdiv((int)$avgCheckinMin, 60), ((int)$avgCheckinMin) % 60)
                : '---';
            $avgCheckout = $avgCheckoutMin > 0
                ? sprintf('%02d:%02d', intdiv((int)$avgCheckoutMin, 60), ((int)$avgCheckoutMin) % 60)
                : '---';

            $totalWorkingMinutes = (float) ($row->total_working_minutes ?? 0);
            $totalHours = (int) floor($totalWorkingMinutes / 60);
            $totalMinutes = (int) ($totalWorkingMinutes % 60);
            $totalHoursFormatted = $totalWorkingMinutes > 0 ? sprintf('%02d:%02d', $totalHours, $totalMinutes) : '---';

            $avgWorkingMinPerDay = $daysPresent > 0 ? round($totalWorkingMinutes / $daysPresent) : 0;
            $avgWorkingHrsFormatted = $avgWorkingMinPerDay > 0 ? sprintf('%02d:%02d', floor($avgWorkingMinPerDay / 60), $avgWorkingMinPerDay % 60) : '---';

            $requiredHours = $totalDays * $requiredHoursBase;
            $requiredHoursFormatted = $requiredHours > 0 ? sprintf('%02d:00', $requiredHours) : '---';
            $performance = $requiredHours > 0 ? min(100, round(($totalWorkingMinutes / 60 / $requiredHours) * 100)) : 0;

            // Resolve profile picture as in High Absenteeism section
            $img = null;
            if (!empty($row->profile_picture)) {
                $img = $row->profile_picture;
            }

            return [
                'name' => $name,
                'department' => (string) ($row->department_name ?? '---'),
                'img' => $img,
                'present' => $daysPresent,
                'absent' => $daysAbsent,
                'leave' => $daysLeave,
                'manual_logs' => $manualLogs,
                'avg_checkin' => $avgCheckin,
                'avg_checkout' => $avgCheckout,
                'late_in' => $lateInCount,
                'early_out' => $earlyOutCount,
                'avg_working_hrs' => $avgWorkingHrsFormatted,
                'total_hours' => $totalHoursFormatted,
                'required_hours' => $requiredHoursFormatted,
                'performance' => $performance,
            ];
        })->values()->toArray();

        $pdfData = [
            'companyName' => $companyName,
            'generatedDate' => $generatedDate,
            'periodLabel' => $periodLabel,
            'stats' => $stats['stats'] ?? [],
            'dayTrends' => $dayTrends['data'] ?? [],
            'departmentBreakdown' => $departmentBreakdown['data'] ?? [],
            'punctualityTop' => $punctuality['data'] ?? [],
            'highAbsenteeism' => $highAbsenteeism,
            'frequentLateIns' => $frequentLateIns,
            'employeeDetails' => $employeeDetails,
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.company_summary_report', $pdfData)
            ->setPaper('a4', 'landscape');

        $filename = 'attendance_summary_' . str_replace(' ', '_', strtolower($periodLabel)) . '.pdf';

        return $pdf->download($filename);
    }

    private function buildAvgTimeSelect(string $column, string $alias): string
    {
        return "
        AVG(
            CASE
                WHEN {$column} IS NOT NULL
                    AND {$column} != '---'
                    AND {$column} != ''
                    AND {$column} ~ '^[0-9]{1,2}:[0-9]{2}'
                THEN EXTRACT(HOUR FROM {$column}::time) * 60
                    + EXTRACT(MINUTE FROM {$column}::time)
                ELSE NULL
            END
        ) as {$alias}
    ";
    }

    private function buildSumDurationSelect(string $column, string $alias): string
    {
        return "
        SUM(
            CASE
                WHEN {$column} IS NOT NULL
                    AND {$column} != '---'
                    AND {$column} != ''
                    AND {$column} ~ '^[0-9]{1,2}:[0-9]{2}'
                THEN EXTRACT(HOUR FROM {$column}::time) * 60
                    + EXTRACT(MINUTE FROM {$column}::time)
                ELSE 0
            END
        ) as {$alias}
    ";
    }

    /**
     * Quote column name for PostgreSQL (handles reserved keywords like 'in', 'out')
     */
    private function quoteColumnPgsql(string $column): string
    {
        // Split table.column format
        if (str_contains($column, '.')) {
            [$table, $col] = explode('.', $column, 2);
            return "\"{$table}\".\"{$col}\"";
        }
        return "\"{$column}\"";
    }

    private function resolveAttendanceHour($timeValue): int
    {
        if (!is_string($timeValue)) {
            return 0;
        }

        $value = trim($timeValue);
        if ($value === '' || $value === '---') {
            return 0;
        }

        $formats = ['H:i', 'H:i:s', 'g:i A', 'g:iA', 'h:i A', 'h:iA'];

        foreach ($formats as $format) {
            try {
                return Carbon::createFromFormat($format, $value)->hour;
            } catch (\Throwable $e) {
            }
        }

        try {
            return Carbon::parse($value)->hour;
        } catch (\Throwable $e) {
        }

        if (preg_match('/^(\d{1,2})/', $value, $matches)) {
            $hour = (int) $matches[1];
            if ($hour >= 0 && $hour <= 23) {
                return $hour;
            }
        }

        return 0;
    }

    private function normalizeIds($value): array
    {
        if (is_null($value) || $value === '') {
            return [];
        }

        if (is_string($value)) {
            $value = explode(',', $value);
        }

        if (!is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map(static function ($item) {
            if ($item === '' || is_null($item)) {
                return null;
            }
            return (int) $item;
        }, $value), static fn($item) => !is_null($item) && $item > 0));
    }

    private function sumDurationMinutes(array $times): int
    {
        $total = 0;

        foreach ($times as $time) {
            if (!is_string($time) || $time === '---' || strpos($time, ':') === false) {
                continue;
            }

            [$hours, $minutes] = array_pad(explode(':', $time), 2, 0);
            $total += ((int) $hours * 60) + (int) $minutes;
        }

        return $total;
    }

    private function avgDurationMinutes(array $times): int
    {
        $durations = [];

        foreach ($times as $time) {
            if (!is_string($time) || $time === '---' || strpos($time, ':') === false) {
                continue;
            }

            [$hours, $minutes] = array_pad(explode(':', $time), 2, 0);
            $durations[] = ((int) $hours * 60) + (int) $minutes;
        }

        if (count($durations) === 0) {
            return 0;
        }

        return (int) round(array_sum($durations) / count($durations));
    }

    private function minutesToHoursLabel(int $minutes, int $precision = 0): string
    {
        $hours = $minutes / 60;
        return number_format($hours, $precision) . 'h';
    }

    private function trendPercent(float|int $current, float|int $previous): float
    {
        if ((float) $previous === 0.0) {
            return 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function formatTrend(float $trend): string
    {
        return number_format(abs($trend), 1) . '%';
    }

    public function getEmployeeLeavecount($request)
    {

        $model = Attendance::where("employee_id", $request->system_user_id)
            ->where("date", '>=', $request->start_date)
            ->where("date", '<=', $request->end_date)
            ->where("company_id", $request->company_id);




        return  $info = (object) [
            'total_absent' => $model->clone()->where('status', 'A')->count(),
            'total_present' => $model->clone()->where('status', 'P')->count(),
            'total_off' => $model->clone()->where('status', 'O')->count(),
            'total_missing' => $model->clone()->where('status', 'M')->count(),
            'total_leaves' => $model->clone()->where('status', 'L')->count(),
            'total_early' => $model->clone()->where('early_going', '!=', '---')->count(),


        ];
    }
    public function getAvgClockIn($request)
    {

        $timestamps = AttendanceLog::where("UserID", $request->system_user_id)
            ->where("LogTime", '>=', $request->start_date)
            ->where("LogTime", '<=', $request->end_date)
            ->where("company_id", $request->company_id)->orderBy('LogTime', 'asc')->pluck('LogTime');

        $timeDifferences = [];
        $date_prev = '';
        foreach ($timestamps as $timestamp) {
            $timeComponents = explode(' ', $timestamp);
            $date = $timeComponents[0];
            if ($date != $date_prev) {
                $time = $timeComponents[1];
                list($hours, $minutes) = explode(':', $time);
                $totalSeconds = $hours * 3600 + $minutes * 60;
                $timeDifferences[] = $totalSeconds;

                $date_prev = $date;
            }
        }

        if (count($timeDifferences) > 0) {
            $averageTimeInSeconds = array_sum($timeDifferences) / count($timeDifferences);
        } else {
            $averageTimeInSeconds = 0;
        }
        $averageTimeFormatted = gmdate("H:i", $averageTimeInSeconds);

        return $averageTimeFormatted;
    }
    public function getAvgClockOut($request)
    {


        $timestamps = AttendanceLog::where("UserID", $request->system_user_id)
            ->where("LogTime", '>=', $request->start_date)
            ->where("LogTime", '<=', $request->end_date)
            ->where("company_id", $request->company_id)->orderBy('LogTime', 'desc')->pluck('LogTime');


        $dateCount = array();

        foreach ($timestamps as $timestamp) {
            $date = date("Y-m-d", strtotime($timestamp));

            if (isset($dateCount[$date])) {
                $dateCount[$date]++;
            } else {
                $dateCount[$date] = 1;
            }
        };

        $timeDifferences = [];
        $date_prev = '';
        foreach ($timestamps as $timestamp) {
            $timeComponents = explode(' ', $timestamp);
            $date = $timeComponents[0];
            if ($date != $date_prev &&  $dateCount[$date] > 1) {
                $time = $timeComponents[1];
                list($hours, $minutes) = explode(':', $time);
                $totalSeconds = $hours * 3600 + $minutes * 60;
                $timeDifferences[] = $totalSeconds;

                $date_prev = $date;
            }
        }

        if (count($timeDifferences) > 0) {
            $averageTimeInSeconds = array_sum($timeDifferences) / count($timeDifferences);
        } else {
            $averageTimeInSeconds = 0;
        }
        $averageTimeFormatted = gmdate("H:i", $averageTimeInSeconds);

        return $averageTimeFormatted;
    }

    public function  getAvgWorkingHours($request)
    {
        $timestamps = Attendance::where("employee_id", $request->system_user_id)
            ->where("date", '>=', $request->start_date)
            ->where("date", '<=', $request->end_date)
            ->where("company_id", $request->company_id)
            ->where("total_hrs", '!=', "---")
            ->pluck('total_hrs');

        $timeDifferences = [];



        foreach ($timestamps as $time) {

            list($hours, $minutes) = explode(':', $time);
            $totalSeconds = $hours * 3600 + $minutes * 60;
            $timeDifferences[] = $totalSeconds;
        }



        if (count($timeDifferences) > 0) {
            $averageTimeInSeconds = array_sum($timeDifferences) / count($timeDifferences);
        } else {
            $averageTimeInSeconds = 0;
        }
        $averageTimeFormatted = gmdate("H:i", $averageTimeInSeconds);

        return $averageTimeFormatted;
    }
    public function seedDefaultDataManual(Request $request)
    {
        $scheduleEmployees = ScheduleEmployee::withOut("shift", "shift_type")
            ->where("company_id", $request->company_id)
            ->get([
                "shift_id",
                "employee_id",
                "shift_type_id",
                "company_id",
            ]);

        if ($scheduleEmployees->isEmpty()) {
            $message = "Cron AttendanceSeeder: No record found.";
            info($message);
            return $message;
        }

        $daysInMonth = Carbon::now()->month(date('m'))->daysInMonth;

        $startDate = $request->startDate ?? date('j');

        $endDate = $request->endDate ?? $daysInMonth;


        $arr = [];


        foreach ($scheduleEmployees as $scheduleEmployee) {
            foreach (range($startDate, $endDate) as $day) {
                $arr[] = [
                    "date" => date("Y-m-") . ($day < 10 ? '0' . $day : $day),
                    "employee_id" => $scheduleEmployee->employee_id,
                    "shift_id" => $scheduleEmployee->shift_id,
                    "shift_type_id" => $scheduleEmployee->shift_type_id,
                    "status" => "---",
                    "in" => "---",
                    "out" => "---",
                    "total_hrs" => "---",
                    "ot" => "---",
                    "late_coming" => "---",
                    "early_going" => "---",
                    "device_id_in" => "---",
                    "device_id_out" => "---",
                    "company_id" => $request->company_id,
                ];
            }
        }

        $attendance = Attendance::query();
        $attendance->whereIn("date", array_column($arr, "date"));
        $attendance->whereIn("employee_id", array_column($arr, "employee_id"));
        $attendance->where("company_id", $request->company_id);
        $attendance->delete();
        $attendance->insert($arr);
        // return $attendance->get();
        $message = "Cron AttendanceSeeder: " . count($arr) . " record has been inserted.";

        info($message);

        return $message;
    }

    public function ProcessAttendance()
    {

        // $night = new NightShiftController;
        // $night->processNightShift();

        // $single = new SingleShiftController;
        // $single->processSingleShift();

        $multiInOut = new MultiInOutShiftController;
        return $multiInOut->processShift();
    }



    public function SyncAttendance()
    {
        $items = [];
        $model = AttendanceLog::query();
        $model->where("checked", false);
        $model->take(1000);
        if ($model->count() == 0) {
            return false;
        }
        return $logs = $model->get(["id", "UserID", "LogTime", "DeviceID", "company_id"]);

        $i = 0;

        foreach ($logs as $log) {

            $date = date("Y-m-d", strtotime($log->LogTime));

            $AttendanceLog = new AttendanceLog;

            $orderByAsc = $AttendanceLog->where("UserID", $log->UserID)->whereDate("LogTime", $date);
            $orderByDesc = $AttendanceLog->where("UserID", $log->UserID)->whereDate("LogTime", $date);

            $first_log = $orderByAsc->orderBy("LogTime")->first() ?? false;
            $last_log =  $orderByDesc->orderByDesc('LogTime')->first() ?? false;

            $logs = $AttendanceLog->where("UserID", $log->UserID)->whereDate("LogTime", $date)->count();

            $item = [];
            $item["company_id"] = $log->company_id;
            $item["employee_id"] = $log->UserID;
            $item["date"] = $date;

            if ($first_log) {
                $item["in"] = $first_log->time;
                $item["status"] = "---";
                $item["device_id_in"] = $first_log->DeviceID ?? "---";
            }
            if ($logs > 1 && $last_log) {
                $item["out"] = $last_log->time;
                $item["device_id_out"] = $last_log->DeviceID ?? "---";
                $item["status"] = "P";
                $diff = abs(($last_log->show_log_time - $first_log->show_log_time));
                $h = floor($diff / 3600);
                $m = floor(($diff % 3600) / 60);
                $item["total_hrs"] = (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
            }

            $attendance = Attendance::whereDate("date", $date)->where("employee_id", $log->UserID);

            $attendance->first() ? $attendance->update($item) : Attendance::create($item);

            AttendanceLog::where("id", $log->id)->update(["checked" => true]);

            $i++;

            // $items[$date][$log->UserID] = $item;
        }

        return $i;
    }

    public function SyncAbsent()
    {
        $previousDate = date('Y-m-d', strtotime('-1 days'));

        $employeesThatDoesNotExist = ScheduleEmployee::with('roster')->whereDoesntHave('attendances', function ($q) use ($previousDate) {
            $q->whereDate('date', $previousDate);
        })
            ->get(["employee_id", "company_id", "roster_id"])
            ->groupBy("company_id");

        // Debug
        // $employeesThatDoesNotExist = ScheduleEmployee::whereIn("company_id", [1, 8])->whereIn("employee_id", [1001])
        //     ->whereDoesntHave('attendances', function ($q) use ($previousDate) {
        //         $q->whereDate('date', $previousDate);
        //     })
        //     ->get(["employee_id", "company_id"]);

        return $this->runFunc($employeesThatDoesNotExist, $previousDate);
    }


    public function SyncAbsentByManual(Request $request)
    {
        // return $this->SyncAbsent();

        $date = $request->input('date', date('Y-m-d'));
        $previousDate = date('Y-m-d', strtotime($date . '-1 days'));
        // return [$date, $previousDate];
        $model = ScheduleEmployee::whereIn("company_id", $request->company_ids);

        $model->when(count($request->UserIDs ?? []) > 0, function ($q) use ($request) {
            $q->whereIn("employee_id", $request->UserIDs);
        });

        $model->whereDoesntHave('attendances', function ($q) use ($previousDate) {
            $q->whereDate('date', $previousDate);
        });

        return $employeesThatDoesNotExist =  $model->with('roster')
            ->get(["employee_id", "company_id", "shift_type_id", "roster_id"])
            ->groupBy("company_id");
        return $this->runFunc($employeesThatDoesNotExist, $previousDate);
    }


    public function SyncAbsentForMultipleDays()
    {
        $first = AttendanceLog::orderBy("id")->first();
        $today = date('Y-m-d');
        $startDate = $first->edit_date;
        $difference = strtotime($startDate) - strtotime($today);
        $days = abs($difference / (60 * 60) / 24);
        $arr = [];

        for ($i = $days; $i > 0; $i--) {
            $arr[] = $this->SyncAbsent($i);
        }

        return json_encode($arr);
    }

    public function ResetAttendance(Request $request)
    {
        $items = [];
        $model = AttendanceLog::query();
        $model->whereBetween("LogTime", [$request->from_date ?? date("Y-m-d"), $request->to_date ?? date("Y-m-d")]);
        $model->where("DeviceID", $request->DeviceID);

        if ($model->count() == 0) {
            return false;
        }
        $logs = $model->get(["id", "UserID", "LogTime", "DeviceID", "company_id"]);


        $i = 0;

        foreach ($logs as $log) {

            $date = date("Y-m-d", strtotime($log->LogTime));

            $AttendanceLog = new AttendanceLog;

            $orderByAsc = $AttendanceLog->where("UserID", $log->UserID)->whereDate("LogTime", $date);
            $orderByDesc = $AttendanceLog->where("UserID", $log->UserID)->whereDate("LogTime", $date);

            $first_log = $orderByAsc->orderBy("LogTime")->first() ?? false;
            $last_log =  $orderByDesc->orderByDesc('LogTime')->first() ?? false;

            $logs = $AttendanceLog->where("UserID", $log->UserID)->whereDate("LogTime", $date)->count();

            $item = [];
            $item["company_id"] = $log->company_id;
            $item["employee_id"] = $log->UserID;
            $item["date"] = $date;

            if ($first_log) {
                $item["in"] = $first_log->time;
                $item["status"] = "---";
                $item["device_id_in"] = Device::where("device_id", $first_log->DeviceID)->pluck("id")[0] ?? "---";
            }
            if ($logs > 1 && $last_log) {
                $item["out"] = $last_log->time;
                $item["device_id_out"] = Device::where("device_id", $last_log->DeviceID)->pluck("id")[0] ?? "---";
                $item["status"] = "P";
                $diff = abs(($last_log->show_log_time - $first_log->show_log_time));
                $h = floor($diff / 3600);
                $m = floor(($diff % 3600) / 60);
                $item["total_hrs"] = (($h < 10 ? "0" . $h : $h) . ":" . ($m < 10 ? "0" . $m : $m));
            }


            $attendance = Attendance::whereDate("date", $date)->where("employee_id", $log->UserID);

            $attendance->first() ? $attendance->update($item) : Attendance::create($item);

            AttendanceLog::where("id", $log->id)->update(["checked" => true]);

            $i++;

            $items[$date][$log->UserID] = $item;
        }

        Storage::disk('local')->put($request->DeviceID . '-' . date("d-M-y") . '-reset_attendance.txt', json_encode($items));

        return $i;
    }

    public function runFunc($companyIDs, $previousDate)
    {
        $result = null;
        $record = [];
        foreach ($companyIDs as $companyID => $employeesThatDoesNotExist) {
            $NumberOfEmployee = count($employeesThatDoesNotExist);

            if (!$NumberOfEmployee) {
                $result .= $this->getMeta("SyncAbsent", "No employee(s) found against company id $companyID .\n");
                continue;
            }


            $employee_ids = [];
            foreach ($employeesThatDoesNotExist as $employee) {
                $arr = [
                    "employee_id"   => $employee->employee_id,
                    "date"          => $previousDate,
                    "status"        => $this->getDynamicStatus($employee, $previousDate),
                    "company_id"    => $employee->company_id,
                    "shift_type_id"    => $employee->shift_type_id,

                    "created_at"    => date('Y-m-d H:i:s'),
                    "updated_at"    => date('Y-m-d H:i:s'),
                    "updated_func" => "runFunc"
                ];
                $record[] = $arr;

                $employee_ids[] = $employee->employee_id;
            }

            $result .= $this->getMeta("SyncAbsent", "$NumberOfEmployee employee(s) absent against company id $companyID.\n Employee IDs: " . json_encode($employee_ids));
        }


        Attendance::insert($record);
        // return $record[0];
        return $result;
    }

    public function getDynamicStatus($employee, $date)
    {
        $shift = array_filter($employee->roster->json, function ($shift) use ($date) {
            return $shift['day'] ==  date('D', strtotime($date));
        });

        $obj = reset($shift);

        if ($obj['shift_id'] == -1) {
            return "OFF";
        }
        return "A";
    }

    public function seedFakeDataForTesting($company_id, $employee_id)
    {
        $params = ["company_id" => $company_id, "date" => date("Y-m-d"), "employee_id" => $employee_id];

        $employees = Employee::query();

        $employees->where("company_id", $params["company_id"]);
        $employees->where("system_user_id", $params["employee_id"]);


        $employees->withOut(["department", "sub_department", "designation"]);

        $employees->with(["schedule" => function ($q) use ($params) {
            $q->where("company_id", $params["company_id"]);
            $q->where("employee_id", $params["employee_id"]);
            $q->where("to_date", ">=", $params["date"]);
            // $q->where("shift_type_id", $params["shift_type_id"]);
            $q->withOut("shift_type");
            $q->select("shift_id", "isOverTime", "employee_id", "shift_type_id");
            $q->orderBy("to_date", "asc");
        }]);

        $daysInMonth = Carbon::now()->month(date('m'))->daysInMonth;

        $employee = $employees->first();

        if (!$employee) {
            info("No record found");
            return;
        }

        $data = [];

        foreach (range(1, $daysInMonth) as $day) {
            $data[] = [
                "date" => date("Y-m-") . sprintf("%02d", date($day)),
                "employee_id" => $params["employee_id"],
                "shift_id" => $employee->schedule->shift_id,
                "shift_type_id" => $employee->schedule->shift_type_id,
                "status" => Arr::random(["P", "A", "M", "O", "ME"]),
                "in" => "---",
                "out" => "---",
                "total_hrs" => "---",
                "ot" => "---",
                "late_coming" => "---",
                "early_going" => "---",
                "device_id_in" => "---",
                "device_id_out" => "---",
                "company_id" => $company_id,
            ];
        }

        $chunks = array_chunk($data, 100);

        $insertedCount = 0;

        $attendance = Attendance::query();
        $attendance->where("company_id", $company_id);
        $attendance->whereMonth("date", date("m"));
        $attendance->delete();

        foreach ($chunks as $chunk) {
            $attendance->insert($chunk);
            $insertedCount += count($chunk);
        }

        $message = "Cron AttendanceSeeder: " . $insertedCount . " record has been inserted.";
        return $message;
    }

    public function regenerateAttendance(Request $request)
    {
        if ($request->shift_type_id == 1) {
            return (new FiloShiftController)->render($request->company_id ?? 0, $request->date ?? date("Y-m-d"), $request->shift_type_id, [$request->UserID], true, $request->channel ?? "unknown");
        }
        if ($request->shift_type_id == 2) {
            $outputBuffer = new BufferedOutput();

            Artisan::call('task:sync_multi_shift_dual_day', [
                'company_id' => $request->company_id,
                'date' => $request->date,
                'checked' => true,
                'UserID' => $request->UserID,
            ], $outputBuffer);

            return response()->json(['message' => $outputBuffer->fetch()]);
        }
        if ($request->shift_type_id == 4) {
            return (new NightShiftController)->renderData($request);
        }
        if ($request->shift_type_id == 5) {
            return (new SplitShiftController)->renderData($request);
        }
        if ($request->shift_type_id == 6) {
            return array_merge(
                (new SingleShiftController)->renderData($request),
            );
        }
    }

    private function buildSumMinutesSelect(string $column, string $alias): string
    {
        return "
        SUM(
            CASE
                WHEN {$column} IS NOT NULL
                    AND {$column} != '---'
                    AND {$column} != ''
                THEN
                    CASE
                        WHEN {$column} LIKE '%:%'
                            AND {$column} ~ '^[0-9]{1,3}:[0-9]{1,2}$'
                        THEN
                            (split_part({$column}, ':', 1)::integer * 60)
                            + split_part({$column}, ':', 2)::integer
                        WHEN {$column} ~ '^[0-9]+$'
                        THEN {$column}::integer
                        ELSE 0
                    END
                ELSE 0
            END
        ) as {$alias}
    ";
    }
}
