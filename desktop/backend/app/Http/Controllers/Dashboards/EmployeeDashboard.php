<?php

namespace App\Http\Controllers\Dashboards;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\EmployeeLeaves;
use App\Models\Visitor;
use DateTime;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class EmployeeDashboard extends Controller
{

    public function statistics(Request $request)
    {

        $records = $this->getEmployeeAttendanceRecords($request);


        // Get today's date
        $today = new DateTime();
        // Get the last day of the current month
        $endOfMonth = new DateTime('last day of this month');

        // Calculate remaining days (excluding today)
        $remainingDays = (int)$today->diff($endOfMonth)->format('%a');

        return [
            [
                'Key' => 'P',
                'title' => 'Presents',
                'value' => $this->getStatusCount($records, 'P'),
                'icon' => 'fas fa-calendar-check',
                'color' => 'success',
                'link' => $this->getLink($request, 'P'),
            ],
            [
                'Key' => 'A',
                'title' => 'Absence',
                'value' => $this->getStatusCount($records, 'A') - $remainingDays,
                'icon' => 'fas fa-calendar-times',
                'color' => 'warning',
                'link' => $this->getLink($request, 'A'),
            ],
            [
                'Key' => 'M',
                'title' => 'Incomplete',
                'value' => $this->getStatusCount($records, 'M'),
                'icon' => 'fas fa-calendar-times',
                'color' => 'warning',
                'link' => $this->getLink($request, 'M'),
            ],
            [
                'Key' => 'ME',
                'title' => 'Manual Entry',
                'value' => $this->getStatusCount($records, 'ME'),
                'icon' => 'fas fa-calendar-times',
                'color' => 'warning',
                'link' => $this->getLink($request, 'ME'),
            ],
            [
                'Key' => 'L',
                'title' => 'Leaves',
                'value' => $this->getStatusCount($records, 'L'),
                'icon' => 'fas fa-calendar-week',
                'color' => 'indigo',
                'link' => $this->getLink($request, 'L'),
                'border_color' => '526C78',
            ],
            [
                'Key' => 'H',
                'title' => 'Holidays',
                'value' => $this->getStatusCount($records, 'H'),
                'icon' => 'fas fa-calendar-plus',
                'color' => 'grey',
                'link' => $this->getLink($request, 'H'),
                'border_color' => '526C78',
            ],
            [
                'Key' => 'LI',
                'title' => 'Late In',
                'value' => $this->getStatusCount($records, 'LC'),
                'icon' => 'fas fa-calendar',
                'color' => 'red',
                'link' => $this->getLink($request, 'LC'),
                'border_color' => '526C78',
            ],
            [
                'Key' => 'EO',
                'title' => 'Early Out',
                'value' => $this->getStatusCount($records, 'EG'),
                'icon' => 'fas fa-calendar',
                'color' => 'red',
                'link' => $this->getLink($request, 'EG'),
                'border_color' => '526C78',
            ],
            [
                'Key' => 'O',
                'title' => 'Week Off',
                'value' => $this->getStatusCount($records, 'O'),
                'icon' => 'fas fa-calendar',
                'color' => 'grey',
                'link' => $this->getLink($request, 'O'),
                'border_color' => '526C78',
            ],
            [
                'Key' => 'OT',
                'title' => 'Overtime',
                'value' => $this->getTotalOvertime($records),
                'icon' => 'fas fa-clock',
                'color' => 'cyan',
                'border_color' => '526C78',
            ],
        ];
    }

    public function getNotificationCount(Request $request)
    {

        $model = EmployeeLeaves::query();
        $model->where('company_id', $request->company_id);
        $model->when($request->filled('branch_id'), function ($q) use ($request) {
            $q->where('branch_id',  $request->branch_id);
        });
        $model->where('status', 0);

        $data['employee_leaves_pending_count'] = $model->count();

        //visitors pending count 

        $Visitors = Visitor::query();
        //  $Visitors->with(["attendances"]);
        $Visitors->whereCompanyId($request->company_id);
        $Visitors->where('status_id',   1);
        $Visitors->when($request->filled('branch_id'), function ($q) use ($request) {
            $q->where('branch_id',   $request->branch_id);
        });

        $data['visitor_request_pending_count'] = $Visitors->count();

        return $data;
    }

    public function getLink($request, $status)
    {
        $baseUrl = env("BASE_URL");

        $params = [
            'main_shift_type' => $request->shift_type_id,
            'company_id' => $request->company_id,
            'status' => $status,
            'department_id' => $request->department_id,
            'employee_id' => $request->employee_id,
            'report_type' => 'Monthly',
            'from_date' => date("Y-m-01"),
            'to_date' => date("Y-m-t"),
        ];

        $queryString = http_build_query($params);

        //$url = $baseUrl . "/api/multi_in_out_daily?" . $queryString;
        $url = $baseUrl . "/api/multi_in_out_monthly?" . $queryString;

        return $url;
    }

    private function getStatusCount($records, $status): int
    {
        return $records->where('status', $status)->count();
    }

    private function getTotalOvertime($records): string
    {
        $totalMinutes = 0;

        foreach ($records as $record) {
            $ot = $record->ot;
            if (!$ot || $ot === '---' || $ot === '00:00') continue;

            if (str_contains($ot, ':')) {
                $parts = explode(':', $ot);
                $totalMinutes += (int)$parts[0] * 60 + (int)($parts[1] ?? 0);
            }
        }

        $hours = floor($totalMinutes / 60);
        $mins = $totalMinutes % 60;

        return $hours > 0 || $mins > 0 ? sprintf('%d:%02d', $hours, $mins) : '0:00';
    }

    public function getEmployeeAttendanceRecords($request)
    {
        $model = Attendance::query();

        $model->where('company_id', $request->company_id ?? 0);

        $model->where('employee_id', $request->employee_id);

        $model->whereMonth('date', now()->month);

        return $model->whereIn('status', ['P', 'A', 'M', 'O', 'H', 'L', 'V', 'ME'])->get();

        // working code with cache
        $cacheKey = 'employee_attendance_records:' . $request->company_id . "_" . $request->employee_id;

        return Cache::remember($cacheKey, now()->endOfDay(), function () use ($request) {

            $model = Attendance::query();

            $model->where('company_id', $request->company_id ?? 0);

            $model->where('employee_id', $request->employee_id);

            $model->whereMonth('date', now()->month);

            return $model->whereIn('status', ['P', 'A', 'M', 'O', 'H', 'L', 'V'])->get();
        });
    }

    public function clearEmployeeCache($request)
    {
        $cacheKey = 'employee_attendance_records:' . $request->company_id . "_" . $request->employee_id;

        Cache::forget($cacheKey);
    }
}
