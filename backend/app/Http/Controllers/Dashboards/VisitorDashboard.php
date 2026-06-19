<?php

namespace App\Http\Controllers\Dashboards;

use App\Http\Controllers\Controller;

use App\Models\Attendance;
use App\Models\Device;
use App\Models\Employee;
use App\Models\HostCompany;
use App\Models\Leave;
use App\Models\Visitor;
use App\Models\VisitorAttendance;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class VisitorDashboard extends Controller
{
    /**
     * Handle the incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */

    public function timeTOSeconds($str_time)
    {


        return  $seconds = strtotime($str_time) - strtotime('TODAY');
    }
    public function __invoke(Request $request)
    {
        $date = date("Y-m-d");

        $id = $request->company_id ?? 0;

        $Visitors = Visitor::query();
        //  $Visitors->with(["attendances"]);
        $Visitors->whereCompanyId($id);
        $Visitors->when($request->filled('branch_id'), function ($q) use ($request) {
            $q->where('branch_id',   $request->branch_id);
        });

        $Visitors->whereDate("visit_from", "<=", date('Y-m-d'));
        $Visitors->whereDate("visit_to", ">=", date('Y-m-d'));


        $VisitorAttendance = VisitorAttendance::query();
        $VisitorAttendance->whereCompanyId($id);
        $VisitorAttendance->when($request->filled('branch_id'), function ($q) use ($request) {
            $q->where('branch_id',   $request->branch_id);
        });;
        $VisitorAttendance->where("date", "<=", date('Y-m-d'));
        $VisitorAttendance->where("date", ">=", date('Y-m-d'));
        $VisitorAttendance->with(["visitor"])->get();







        $host  = HostCompany::whereCompanyId($id)
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $q->Where('branch_id',   $request->branch_id);
            });

        $host_count = $host->count();


        $opened_office = $host->where("open_time", "<=", date('H:i'))->where("close_time", ">=", date('H:i'))->count();
        $closed_office =  $host_count - $opened_office;

        $overStayCount =  $VisitorAttendance->clone()

            ->whereHas("visitor", fn ($q) => $q->where("visitor_attendances.out", null)->where("visitors.time_out", '<', date("H:i")))
            ->count();



        return [
            "visitorCounts" => [
                [
                    "title" => "Expected",
                    "value" => $Visitors->clone()->whereIn('status_id', [2, 4, 5, 6, 7])->count(), // $Visitors->clone()->where('status_id',   2)->count(),
                    "icon" => "mdi-account-details",
                    "color" => "l-bg-orange-dark",
                    "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=A&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=A&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],
                [
                    "title" => "Checked In",
                    "value" => $VisitorAttendance->clone()->where("in", "!=", null)->count(), //$Visitors->clone()->where('status_id', ">=", 6)->count(),
                    "icon" => "mdi-account-arrow-left",
                    "color" => "l-bg-green-dark",
                    "link"  => env("BASE_URL") . "/api/daily?company_id=$id&status=SA&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?company_id=$id&status=SA&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],
                [
                    "title" => "Checked Out",
                    "value" => $VisitorAttendance->clone()->where("out", "!=", null)->count(), //$Visitors->clone()->where('status_id',   7)->count(),
                    "icon" => "mdi-account-arrow-right",
                    "color" => "l-bg-purple-dark",
                    "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=P&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=P&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],

                [
                    "title" => "Over Stayed",
                    "value" => $overStayCount,
                    "icon" => "mdi-account-clock",
                    "color" => "l-bg-red-dark",
                    "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],

            ],

            "hostCounts" => [
                [
                    "title" => "Total Company",
                    "value" => $host_count,
                    "icon" => "fas fa-building",
                    "color" => "l-bg-green-dark",
                    "link"  => env("BASE_URL") . "/api/daily?company_id=$id&status=SA&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?company_id=$id&status=SA&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],
                [
                    "title" => "Opened Office",
                    "value" => $opened_office,
                    "icon" => "fas fa-door-open",
                    "color" => "l-bg-purple-dark",
                    "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=P&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=P&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],
                [
                    "title" => "Closed Office",
                    "value" => $closed_office,
                    "icon" => "fas fa-door-closed",
                    "color" => "l-bg-orange-dark",
                    "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=A&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=A&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],
                [
                    "title" => "Weekend",
                    "value" => 0,
                    "icon" => "	fas fa-calendar",
                    "color" => "l-bg-red-dark",
                    "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],
                [
                    "title" => "Vacant",
                    "value" => 0,
                    "icon" => "	fas fa-users",
                    "color" => "l-bg-cyan-dark",
                    "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],
            ],

            "statusCounts" => [
                [
                    "title" => "Total Visitors",
                    "value" => $Visitors->clone()->count(),
                    "icon" => "	fas fa-users",
                    "color" => "l-bg-cyan-dark",
                    "link"  => env("BASE_URL") . "/api/daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                    "multi_in_out"  => env("BASE_URL") . "/api/multi_in_out_daily?page=1&per_page=1000&company_id=$id&status=M&daily_date=" . $date . "&department_id=-1&report_type=Daily",
                ],
                [
                    "title" => "Approved",
                    "value" => $Visitors->clone()->whereIn('status_id', [2, 4, 5, 6, 7])->count(),
                    "icon" => "fas fa-calendar-check",
                    "color" => "l-bg-green-dark",
                ],
                [
                    "title" => "Pending",
                    "value" => $Visitors->clone()->where('status_id',   1)->count(),
                    "icon" => "fas fa-clock",
                    "color" => "l-bg-orange-dark",
                ],
                [
                    "title" => "Rejected",
                    "value" => $Visitors->clone()->where('status_id', 3)->count(),
                    "icon" => "	fas fa-clock",
                    "color" => "l-bg-red-dark",
                ],

            ]
        ];
    }
}
