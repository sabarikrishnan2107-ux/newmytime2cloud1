<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Http\Request;

class OffByDayController extends Controller
{

    public function renderOffByDayWeek1Cron($company_id = 0)
    {
        // return date('l', strtotime('-1 day'));
        $UserIds = $this->renderOffByDayScript($company_id, date('Y-m-d', strtotime('-1 day')), 1);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->getMeta("Sync Off By Day Week 1", "$result Employee has been marked as Off" . ".\n");
    }

    public function renderOffByDayWeek2Cron($company_id = 0)
    {
        $UserIds = $this->renderOffByDayScript($company_id, date('Y-m-d', strtotime('-1 day')), 2);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->getMeta("Sync Off By Day Week 2", "$result Employee has been marked as Off" . ".\n");
    }

    public function renderOffByDayWeek1(Request $request)
    {
        $UserIds = $this->renderOffByDayScript($request->company_id, $request->date, 1, $request->UserID);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->response("$result Employee has been marked as Off", null, true);
    }

    public function renderOffByDayWeek2(Request $request)
    {
        $UserIds = $this->renderOffByDayScript($request->company_id, $request->date, 2, $request->UserID);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->response("$result Employee has been marked as Off", null, true);
    }

    public function renderOffByDayScript($company_id, $date, $weekNumber, $user_id = 0)
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
