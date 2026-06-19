<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Http\Request;

class AbsentController extends Controller
{
    public function renderAbsentCron($company_id = 0)
    {
        $UserIds = $this->renderAbsentScript($company_id, date('Y-m-d', strtotime('-1 day')));
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->getMeta("Sync Absent", "$result Employee has been marked as Absent" . ".\n");
    }

    public function renderAbsent(Request $request)
    {
        $UserIds = $this->renderAbsentScript($request->company_id, $request->date, $request->UserID);
        $result = !count($UserIds) ? "0" : json_encode($UserIds);
        return $this->response("$result Employee has been marked as Absent", null, true);
    }

    // not applicate
    public function renderAbsentScript($company_id, $date, $user_id = 0)
    {
        $model = Employee::query();
        $model->withOut(["department", "designation", "sub_department"]);
        $model->where("company_id", $company_id);
        $model->when($user_id, fn ($q) => $q->where("system_user_id", $user_id));
        $model->with(["schedule" =>  function ($q) use ($date, $company_id) {
            $q->where('to_date', '>=', $date);
            $q->orderBy('to_date', 'asc');
            $q->whereHas("shift");
            $q->whereDoesntHave("attendance_logs", function ($q) use ($company_id, $date) {
                $q->whereDate('LogTime', $date);
                $q->where("company_id", $company_id);
            });
        }]);

        $missingEmployees = $model->get(["employee_id", "system_user_id"]);

        $records = [];

        foreach ($missingEmployees as $missingEmployee) {

            $records[] = [
                "company_id" => $company_id,
                "date" => $date,
                "status" => "A",
                "employee_id" => $missingEmployee->employee_id,
                "shift_id" => $missingEmployee->schedule->shift_id,
                "shift_type_id" => $missingEmployee->schedule->shift_type_id,

            ];
        }

        $UserIds = array_column($records, "employee_id");
        // return $records;

        try {
            if (count($records)) {
                $model = Attendance::query();
                $model->where("company_id", $company_id);
                $model->where("date", $date);
                $model->whereIn("employee_id", $UserIds);
                $model->delete();
                $model->insert($records);
            }

            return $UserIds;
        } catch (\Exception $e) {
            return $e;
        }
    }
}
