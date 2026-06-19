<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Http\Request;

class FlexibleOffController extends Controller
{
    public function renderFlexibleOffWeek1Cron($company_id = 0)
    {
        $UserIds = $this->renderFlexibleOffScript($company_id, date('Y-m-d'), 6);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->getMeta("Sync Flexible Off Week 1", "$result Employee has been marked as Off (Flexible)" . ".\n");
    }

    public function renderFlexibleOffWeek2Cron($company_id = 0)
    {
        $UserIds = $this->renderFlexibleOffScript($company_id, date('Y-m-d'), 13);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->getMeta("Sync Flexible Off Week 2", "$result Employee has been marked as Off (Flexible)" . ".\n");
    }

    public function renderFlexibleOffWeek1(Request $request)
    {
        $UserIds = $this->renderFlexibleOffScript($request->company_id, $request->date, 6, $request->UserID);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->response("$result Employee has been marked as Flexible Off", null, true);
    }

    public function renderFlexibleOffWeek2(Request $request)
    {
        $UserIds = $this->renderFlexibleOffScript($request->company_id, $request->date, 13, $request->UserID);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->response("$result Employee has been marked as Flexible Off", null, true);
    }

    public function renderFlexibleOffScript($company_id, $date, $backDays = 6, $user_id = 0)
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
