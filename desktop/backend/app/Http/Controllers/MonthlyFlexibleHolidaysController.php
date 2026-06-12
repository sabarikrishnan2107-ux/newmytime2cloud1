<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Http\Request;

class MonthlyFlexibleHolidaysController extends Controller
{
    public function renderMonthlyFlexibleHolidaysCron($company_id = 0, $date)
    {
        $yesterdayDate = date("Y-m-d", strtotime($date) - 86400);
        $UserIds = $this->renderMonthlyFlexibleHolidaysScipt($company_id, $yesterdayDate);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->getMeta("Sync Monthly Flexible Holidays", "$result Employee has been marked as Off" . ".\n");
    }

    public function renderMonthlyFlexibleHolidays(Request $request)
    {
        $UserIds = $this->renderMonthlyFlexibleHolidaysScipt($request->company_id, $request->date, $request->UserID);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->response("$result Employee has been marked as Off", null, true);
    }

    public function renderMonthlyFlexibleHolidaysScipt($company_id, $date, $user_id = 0)
    {
        try {
            return \App\Services\Attendance\AttendanceWeekOffService::processWeekOff(
                (int) $company_id,
                $date,
                (int) $user_id
            );
        } catch (\Exception $e) {
            return [];
        }
    }
}
