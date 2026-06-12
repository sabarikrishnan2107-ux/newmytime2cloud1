<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Device;
use App\Models\Employee;
use App\Models\Leave;
use Carbon\Carbon;
use Illuminate\Http\Request;

class CountController extends Controller
{
    /**
     * Handle the incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function __invoke(Request $request)
    {
        $id = $request->company_id ?? 0;
        $model = Attendance::query();
        $model->whereCompanyId($id);

        $date =  date("Y-m-d");
        $model = $model->whereDate('date', $date)->get();


        $modelEmployees = Employee::query();
        $modelEmployees->whereCompanyId($id);

        return [
            [
                "title" => "Today Summary",
                "value" => $model->count(),
                "icon" => "fas fa-clock",
                "color" => "l-bg-purple-dark",
                "link"  => env("BASE_URL") . "/api/daily?company_id=$id&status=SA&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?company_id=$id&status=SA&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                "total_employees_count" => $modelEmployees->count(),
            ],
            [
                "title" => "Today Presents",
                "value" => $model->where('status', 'P')->count(),
                "icon" => "fas fa-calendar-check",
                "color" => "l-bg-green-dark ",
                "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=P&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=P&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                "total_employees_count" => $modelEmployees->count(),
            ],
            [
                "title" => "Today Absent",
                "value" => $model->where('status', 'A')->count(),
                "icon" => "fas fa-calendar-times",
                "color" => "l-bg-orange-dark",
                "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=A&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=A&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                "total_employees_count" => $modelEmployees->count(),
            ],
            [
                "title" => "Today Missing",
                "value" => $model->where('status', 'M')->count(),
                "icon" => "	fas fa-clock",
                "color" => "l-bg-cyan-dark",
                "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                "total_employees_count" => $modelEmployees->count(),
            ],
        ];
    }
}
