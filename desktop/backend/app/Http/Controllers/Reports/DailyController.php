<?php

namespace App\Http\Controllers\Reports;

use App\Models\Company;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Department;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\ReportNotification;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Http\Controllers\WhatsappNotificationsLogController;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class DailyController extends Controller
{

    public function processPDF($request)
    {

        $request->report_template = "Template1";
        $request->from_date = date("Y-m-d", strtotime("yesterday"));
        $request->to_date = date("Y-m-d", strtotime("yesterday"));



        return (new MonthlyController)->processPDF($request);
    }
    public function processPDF2($request)
    {
        $company = Company::whereId($request->company_id)->with('contact')->first(["logo", "name", "company_code", "location", "p_o_box_no", "id"]);
        $model = (new Attendance)->processAttendanceModel($request);
        $deptName = '';
        $totEmployees = '';
        if ($request->department_id && $request->department_id == -1) {
            $deptName = 'All';
            $totEmployees = Employee::whereCompanyId($request->company_id)->count();
        } else {
            $deptName = DB::table('departments')->whereId($request->department_id)->first(["name"])->name ?? '';
            $totEmployees = Employee::where("department_id", $request->department_id)->count();
        }
        $info = (object) [
            'department_name' => $deptName,
            'total_employee' => $totEmployees,
            'total_absent' => $model->clone()->where('status', 'A')->count(),
            'total_present' => $model->clone()->where('status', 'P')->count(),
            'total_off' => $model->clone()->where('status', 'O')->count(),
            'total_missing' => $model->clone()->where('status', 'M')->count(),
            'total_leave' => $model->clone()->where('status', 'L')->count(),
            'total_holiday' => $model->clone()->where('status', 'H')->count(),
            'total_vaccation' => $model->clone()->where('status', 'V')->count(),
            'total_early' => $model->clone()->where('status', 'EG')->count(),
            'total_late' => $model->clone()->where('status', 'LC')->count(),
            'total_weekoff' => $model->clone()->where('status', 'O')->count(),
            'report_type' => $this->getStatusText($request->status) ?? "",
            "daily_date" => $request->daily_date ?? date("Y-m-d"),
            'frequency' => "Daily",
        ];


        $data = $model->get();
        return Pdf::loadView('pdf.attendance_reports.daily', compact("company", "info", "data"));
    }

    public function daily(Request $request)
    {
        $file_name = "Attendance Report";
        if (isset($request->from_date) && isset($request->to_date)) {
            $file_name = "Attendance Report - " . $request->from_date . ' to ' . $request->to_date;
        }
        $file_name = $file_name . '.pdf';
        return $this->processPDF($request)->stream($file_name);
    }
    public function daily_download_pdf(Request $request)
    {

        $file_name = "Attendance Report";
        if (isset($request->from_date) && isset($request->to_date)) {
            $file_name = "Attendance Report - " . $request->from_date . ' to ' . $request->to_date;
        }
        $file_name = $file_name . '.pdf';
        return $this->processPDF($request)->download($file_name);
    }

    public function custom_request_general_old($id, $status, $shift_type_id)
    {

        $apiUrl = env('BASE_URL') . '/api/daily_generate_pdf';
        $queryParams = [
            'report_template' => "Template1",
            'shift_type_id' => $shift_type_id,
            'report_type' => 'Daily',
            'company_id' => $id,
            'status' => $status,
            'daily_date' => date("Y-m-d", strtotime("yesterday")),
        ];

        $response = Http::timeout(300)->withoutVerifying()->get($apiUrl, $queryParams);

        if ($response->successful()) {
            return $response->body();
        } else {
            return $response;
            //return $this->getMeta("Daily Report Generate", "Cannot genereate for Company id: $id");
        }
    }
    public function custom_request_general($id, $status, $shift_type_id)
    {
        $apiUrl = env('BASE_URL') . '/api/daily_generate_pdf';
        $queryParams = [
            'report_template' => "Template1",
            'shift_type_id' => $shift_type_id,
            'report_type' => 'Daily',
            'company_id' => $id,
            'status' => $status,
            'daily_date' => date("Y-m-d", strtotime("yesterday")),
        ];

        $response = Http::timeout(300)->withoutVerifying()->get($apiUrl, $queryParams);

        if ($response->successful()) {
            return $response->body();
        } else {
            return $response;
            //return $this->getMeta("Daily Report Generate", "Cannot genereate for Company id: $id");
        }
        //$this->daily_generate_pdf( $queryParams);
    }

    public function daily_generate_pdf(Request $request)
    {
        $data = $this->processPDF($request)->output();
        //return $data = $this->processPDF($request)->stream();

        $id =  $request->company_id;

        $status = $request->status;

        $file_name = $this->getFileNameByStatus($status);

        // Save the file in local storage
        $file_path = "pdf/$id/daily_$file_name.pdf";
        Storage::disk('local')->put($file_path, $data);




        try {

            $wahtsapp_file_path = "daily_pdf_reports/Daily_Report_{$request->daily_date}_{$this->getStatusText($status)}_{$id}.pdf";

            $public_file_path = public_path($wahtsapp_file_path);

            $publicDirectory = public_path('daily_pdf_reports');
            if (!file_exists($publicDirectory)) {
                mkdir($publicDirectory, 0777, true);
            }
            $dateformat = date('d-M-Y', strtotime($request->daily_date));
            file_put_contents($public_file_path, Storage::disk('local')->get($file_path));
            $msg = "Daily {$this->getStatusText($status)} has been generated for Company id: $id";
            $link = env('BASE_URL') . "/" . $wahtsapp_file_path;
            $company_name = $request->company_name ?? '';
            $message = "Daily Report -  {$this->getStatusText($status)}\n" .
                "Date: {$dateformat}\n" .
                "Click Below Link for Daily Report\n\n" .
                "{$link}\n\n" .

                "Generated at: " . now()->format('d-m-Y H:i:s');
            (new WhatsappNotificationsLogController())->addMessage($request->company_id, "", $message);
        } catch (\Throwable $th) {
            throw $th;
        }

        return $this->getMeta("Daily Report Generate", $msg) . "\n";
    }

    public function getFileNameByStatus($status)
    {
        $arr = [
            "A" => "absent",
            "M" => "missing",
            "P" => "present",
            "O" => "weekoff",
            "L" => "leave",
            "H" => "holiday",
            "V" => "vaccation",
            "LC" => "latein",
            "EG" => "earlyout",
            "-1" => "summary"
        ];

        return $arr[$status];
    }


    public function generateSummaryReport($id)
    {
        $this->processData($id, "daily_summary", "SA");
    }

    public function generatePresentReport($id)
    {
        return $this->processData($id, "daily_present", "P");
    }

    public function generateAbsentReport($id)
    {
        return $this->processData($id, "daily_present", "P");
    }

    public function generateMissingReport($id)
    {
        return $this->processData($id, "daily_missing", "M");
    }

    public function generateManualReport($id)
    {
        $this->processData($id, "daily_manual", "ME");
    }

    public function report($company_id, $report_type, $file_name, $status  = null)
    {

        return $date = date("Y-m-d", strtotime("-2 days"));


        $info = (object)[
            // 'total_employee' => Employee::whereCompanyId($company_id)->count(),
            // 'total_present' => $this->getCountByStatus($company_id, "P", $date),
            // 'total_absent' => $this->getCountByStatus($company_id, "A", $date),
            // 'total_missing' => $this->getCountByStatus($company_id, "---", $date),

            'total_employee' => 0,
            'total_present' => 0,
            'total_absent' => 0,
            'total_missing' => 0,


            'total_early' => 0,
            'total_late' => 0,
            'total_leave' => 0,
            'department_name' => 'All',
            "daily_date" => $date,
            'report_type' => $report_type
        ];


        $data = $this->getModelByQuery($company_id, $date)->get();
        // return $model = $this->getModel($company_id, $date);

        // if ($status !== null) {
        //     $model->where('status', $status);
        // }

        $company = Company::whereId($company_id)->with('contact')->first(["logo", "name", "company_code", "location", "p_o_box_no", "id"]);

        $pdf = Pdf::loadView('pdf.daily', compact("company", "info", "data"))->output();

        Storage::disk('local')->put($company_id . '/' . $file_name, $pdf);

        return "Daily report generated.";
    }

    public function getModelByQuery($company_id, $date)
    {
        $date = date("Y-01-01");

        return DB::table("attendances as a")
            ->where('a.company_id', $company_id)
            ->whereDate('date', $date)
            ->join('employees as e', 'a.employee_id', '=', 'e.system_user_id')
            // ->leftJoin('devices as d_in', 'd_in.id', '=', 'a.device_id_in')
            // ->leftJoin('devices as d_out', 'd_out.device_id', '=', 'a.device_id_out')
            ->select(
                "a.date",
                "a.device_id_in",
                "a.shift_id",
                "a.status",
                "a.in",
                "a.out",
                "a.total_hrs",
                "a.ot",
                "a.late_coming",
                "a.early_going",
                "a.device_id_in",
                "a.device_id_out",
                "e.system_user_id",
                "e.display_name",
                "e.employee_id",
                "e.department_id",
                "e.profile_picture",
                // "d_in.id",
                // "d_in.short_name as device_in_short_name",
                // "d_out.short_name as device_out_short_name",
            );


        $model = Attendance::query();
        $model->where('company_id', 1);
        $model->whereDate('date', $date);


        $model->with([
            "schedule.shift:id,name,working_hours,overtime_interval,on_duty_time,off_duty_time,late_time,early_time,beginning_in,ending_in,beginning_out,ending_out,absent_min_in,absent_min_out,days",
            "schedule.shift_type:id,name",
        ]);

        return $model;
    }

    public function getModel($company_id, $date)
    {
        $model = Attendance::query();
        $model->where('company_id', $company_id);
        $model->whereDate('date', $date);


        $model->with([
            "employee:id,system_user_id,first_name,employee_id,department_id,profile_picture",
            "device_in:id,name,short_name,device_id,location",
            "device_out:id,name,short_name,device_id,location",
            "schedule.shift:id,name,working_hours,overtime_interval,on_duty_time,off_duty_time,late_time,early_time,beginning_in,ending_in,beginning_out,ending_out,absent_min_in,absent_min_out,days",
            "schedule.shift_type:id,name",
        ]);

        return $model;
    }

    public function getCountByStatus($company_id, $status, $date)
    {
        return DB::table("attendances")->where("company_id", $company_id)->whereDate('date', $date)->where('status', $status)->count();
    }

    public function getLogo($logo)
    {
        if (env('APP_ENV') !== 'local') {
            return $logo;
        } else {
            return getcwd() . '/upload/app-logo.jpeg';
        }
    }

    public function getHTML($data, $company, $info)
    {

        $str = '';

        $str .= '<!DOCTYPE html>';
        $str .= '<html>';
        $str .= '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />';
        $str .= '<body>';

        $str .= '<table style="margin-top: -20px !important;backgroundd-color:blue;padding-bottom:0px ">';
        $str .= '<tr>';
        $str .= '<td style="text-align: left;width: 300px; border :none; padding:15px;   backgrozund-color: red">';
        $str .= '<div><br><br><br>';
        $str .= '<img src="' . $this->getLogo($company->logo) . '" height="120px" width="180px">';
        $str .= '<table style="text-align: right; border :none; width:180px; margin-top:5px;backzground-color:blue">';
        $str .= '<tr style="text-align: left; border :none;">';
        $str .= '<td style="text-align: right; border :none;font-size:10px">';
        $str .= '<b>' . $company->name ?? '---' . '</b><br>';
        $str .= '</td>';
        $str .= '</tr>';
        $str .= '<tr style="text-align: left; border :none;">';
        $str .= '<td style="text-align: right; border :none;font-size:10px">';
        $str .= '<span style="margin-right: 3px">P.O.Box ' . $company->p_o_box_no ?? '---' . '</span><br>';
        $str .= '</td>';
        $str .= '</tr>';
        $str .= '<tr style="text-align: left; border :none;">';
        $str .= '<td style="text-align: right; border :none;font-size:10px">';
        $str .= '<span style="margin-right: 3px">' . $company->location ?? '---' . '</span><br>';
        $str .= '</td>';
        $str .= '</tr>';
        $str .= '<tr style="text-align: left; border :none;">';
        $str .= '<td style="text-align: right; border :none;font-size:10px">';
        $str .= '<span style="margin-right: 3px">' . $company->contact->number ?? '---' . '</span><br>';
        $str .= '</td>';
        $str .= '</tr>';
        $str .= '</table>';
        $str .= '</div>';
        $str .= '</td>';


        $str .= '<td style="text-align: left;width: 333px; border :none; padding:15px; backgrozusnd-color:blue">';
        $str .= '<div>';
        $str .= '<table style="text-align: left; border :none;">';
        $str .= '<tr style="text-align: left; border :none;">';
        $str .= '<td style="text-align: center; border :none">';
        $str .= '<span class="title-font">Daily Attendance ' . $info->report_type . ' Report</span>';
        $str .= '<hr style="width: 230px">';
        $str .= '</td>';
        $str .= '</tr>';
        $str .= '<tr style="text-align: left; border :none;">';
        $str .= '<td style="text-align: center; border :none">';
        $str .= ' <span style="font-size: 11px">' . date('d M Y', strtotime($info->daily_date)) . '<br>';
        $str .= '<small>Department : ' . $info->department_name . '</small>';
        $str .= '</span>';
        $str .= '<hr style="width: 230px">';
        $str .= '</td>';
        $str .= '</tr>';
        $str .= '</table>';
        $str .= '</div>';
        $str .= '</td>';

        $str .= '<td style="text-align: right;width: 300px; border :none; backgrounsd-color: red">';
        $str .= '<table class="summary-table" style="border:none; padding:0px 50px; margin-left:35px;margin-top:20px;margin-bottom:0px">';
        $str .= '<tr style="border: none">';
        $str .= '<th style="text-align: center; border :none;padding:10px;font-size: 12px " colspan="3">';
        $str .= '<hr style="width: 200px">';
        $str .= 'Total Number of Employees : ' . $info->total_employee;
        $str .= '</th>';
        $str .= '</tr>';

        $str .= '<tr class="summary-header" style="border: none;background-color:#eeeeee">';
        $str .= '<th style="text-align: center; border :none; padding:5px">Present</th>';
        $str .= '<th style="text-align: center; border :none">Absent</th>';
        $str .= '<th style="text-align: center; border :none">Leave</th>';
        $str .= '</tr>';

        $str .= '<tr style="border: none">';
        $str .= '<td style="text-align: center; border :none; padding:5px;color:green">' . $info->total_present ?? 0  . '</td>';
        $str .= '<td style="text-align: center; border :none; padding:5px;color:red">' . $info->total_absent ?? 0  . '</td>';
        $str .= '<td style="text-align: center; border :none; padding:5px;color:red">' . $info->total_leave ?? 0  . '</td>';
        $str .= '</tr>';

        $str .= '<tr class="summary-header" style="border: none;background-color:#eeeeee">';
        $str .= '<th style="text-align: center; border :none; padding:5px">Late</th>';
        $str .= '<th style="text-align: center; border :none">Early</th>';
        $str .= '<th style="text-align: center; border :none">Missing</th>';
        $str .= '</tr>';

        $str .= '<tr style="border: none">';
        $str .= '<td style="text-align: center; border :none; padding:5px;color:red">' . $info->total_late ?? 0  . '</td>';
        $str .= '<td style="text-align: center; border :none; padding:5px;color:green">' . $info->total_early ?? 0  . '</td>';
        $str .= '<td style="text-align: center; border :none; padding:5px;color:orange">' . $info->total_missing ?? 0  . '</td>';
        $str .= '</tr>';


        $str .= '<tr style="border: none">';
        $str .= '<th style="text-align: center; border :none" colspan="3">';
        $str .= '<hr style="width: 200px">';
        $str .= '</th>';
        $str .= '</tr>';
        $str .= '</table>';
        $str .= '</br>';
        $str .= '</td>';

        $str .= '<hr style="margin:0px;padding:0">';

        $str .= '<div id="footer">';
        $str .= '<div class="pageCounter">';
        $str .= '<p></p>';

        $str .= $this->pageCounter($data);

        $str .= '</div>';
        $str .= '<div id="pageNumbers">';
        $str .= '<div class="page-number" style="font-size: 9px"></div>';
        $str .= '</div>';
        $str .= '</div>';

        $str .= '<footer id="page-bottom-line" style="padding-top: 100px!important">';
        $str .= '<hr style="width: 100%;">';
        $str .= '<table class="footer-main-table">';
        $str .= '<tr style="border :none">';
        $str .= '<td style="text-align: left;border :none"><b>Device</b>: Main Entrance = MED, Back Entrance = BED</td>';
        $str .= '<td style="text-align: left;border :none"><b>Shift Type</b>: Manual = MA, Auto = AU, NO = NO</td>';
        $str .= '<td style="text-align: left;border :none"><b>Shift</b>: Morning = Mor, Evening = Eve, Evening2 = Eve2</td>';
        $str .= '<td style="text-align: right;border :none;">';

        $str .= '<b>Powered by</b>: <span style="color:blue">';
        $str .= '<a href="https://ideahrms.com/" target="_blank">ideahrms.com</a>';
        $str .= '</span>';
        $str .= '</td>';
        $str .= '<td style="text-align: right;border :none">Printed on :' . date('d-M-Y ') . '</td>';
        $str .= '</tr>';
        $str .= '</table>';
        $str .= '</footer>';
        $str .= $this->renderTable($data);
        $str .= '</body>';
        $str .= '</html>';


        $str .= $this->getStyles();

        return $str;
    }

    public function parseData($data)
    {
        $arr = [];

        foreach ($data as $value) {
            $arr[] = [
                "first_name" => $value->employee->first_name,
                "employee_id" => $value->employee_id,
                "in" => $value->in,
                "out" => $value->out,
                "total_hrs" => $value->total_hrs,
                "ot" => $value->ot,
                "status" => $value->status,
                "d_in" => "in",
                "d_out" => "out",
            ];
        }
        return $arr;
    }

    public function renderTable($data)
    {

        // $data = $this->parseData($data);
        $statusColor = '';
        $str = '';

        $i = 0;

        $str .= '<table class="main-table">';

        $str .= '<tr style="text-align: left;font-weight:bold">';
        $str .= '<td style="text-align:  left;"> # </td>';
        $str .= '<td style="text-align:  left;"> Name </td>';
        $str .= '<td style="text-align:  center;width:80px"> EID </td>';
        $str .= '<td style="text-align:  center;width:80px"> In </td>';
        $str .= '<td style="text-align:  center;width:80px"> Out </td>';
        $str .= '<td style="text-align:  center;width:80px"> Total Hours </td>';
        $str .= '<td style="text-align:  center;width:80px"> OT </td>';
        $str .= '<td style="text-align:  center;width:80px"> Status </td>';
        $str .= '<td style="text-align:  center;width:150px"> Device In </td>';
        $str .= '<td style="text-align:  center;width:150px"> Device Out </td>';
        $str .= '</tr>';
        foreach ($data as $data) {

            $str .= '<tbody>';

            $str .= '<tr style="text-align:  center;">';
            $str .= '<td>' . ++$i . '</td>';
            $str .= '<td style="text-align:  left; width:120px">' . $data->display_name . '</td>';
            $str .= '<td>' . $data->employee_id . '</td>';
            $str .= '<td> ' . $data->in . ' </td>';
            $str .= '<td> ' . $data->out . ' </td>';
            $str .= '<td> ' . $data->total_hrs . ' </td>';
            $str .= '<td> ' . $data->ot . ' </td>';
            $str .= '<td style="text-align:  center; color:' . $statusColor  . '"> ' . $data->status . ' </td>';
            $str .= '<td> ' . $data->device_in_short_name  . ' </td>';
            // $str .= '<td> ' . $data->device_out_short_name . ' </td>';

            $str .= '</tr>';
            $str .= '</tbody>';
        }
        $str .= '</table>';
        return $str;
    }

    public function pageCounter($data): string
    {
        $str = '';

        $p = count($data) / 50;

        if ($p <= 1) {
            $str .= '<span></span>';
        } else {
            for ($a = 1; $a <= $p; $a++) {
                $str .= '<span></span>';
            }
        }
        return $str;
    }

    public function getStyles(): string
    {
        $str = '';

        $str .= '<style>';

        $str .= '.pageCounter span{counter-increment:pageTotal}#pageNumbers div:before{counter-increment:currentPage;content:"Page "counter(currentPage) " of "}#pageNumbers div:after{content:counter(pageTotal)}#footer{position:fixed;top:720px;right:0;bottom:0;text-align:center;font-size:12px}#page-bottom-line{position:fixed;right:0;bottom:-6px;text-align:center;font-size:12px;counter-reset:pageTotal}#footer .page:before{content:counter(page,decimal)}#footer .page:after{counter-increment:counter(page,decimal)}@page{margin:20px 30px 40px 50px}table{font-family:arial,sans-serif;border-collapse:collapse;border:none;width:100%}td,th{border:1px solid #eee;text-align:left}tr:nth-child(even){border:1px solid #eee}th{font-size:9px}td{font-size:7px}footer{bottom:0;position:absolute;width:100%}.main-table{padding-bottom:20px;padding-top:10px;padding-right:15px;padding-left:15px}.footer-main-table{padding-bottom:7px;padding-top:0;padding-right:15px;padding-left:15px}hr{position:relative;border:none;height:2px;background:#c5c2c2;padding:0}
        .title-font{font-family:Arial,Helvetica,sans-serif !important;font-size:14px;font-weight:700}.summary-header th{font-size:10px}.summary-table td{font-size:9px}';

        $str .= '</style>';


        return $str;
    }

    public function mimo_daily_process($request)
    {
        $company = Company::whereId($request->company_id)->with('contact')->first(["logo", "name", "company_code", "location", "p_o_box_no", "id"]);
        $model = (new Attendance)->processAttendanceModel($request);
        $deptName = '';
        $totEmployees = '';
        if ($request->department_id && $request->department_id == -1) {
            $deptName = 'All';
            $totEmployees = Employee::whereCompanyId($request->company_id)->whereDate("created_at", "<", date("Y-m-d"))->count();
        } else {
            $deptName = DB::table('departments')->whereId($request->department_id)->first(["name"])->name ?? '';
            $totEmployees = Employee::where("department_id", $request->department_id)->count();
        }

        $info = (object) [
            'department_name' => $deptName,
            'total_employee' => $totEmployees,
            'total_absent' => $model->clone()->where('status', 'A')->count(),
            'total_present' => $model->clone()->where('status', 'P')->count(),
            'total_off' => $model->clone()->where('status', 'O')->count(),
            'total_missing' => $model->clone()->where('status', 'M')->count(),
            'total_leave' => $model->clone()->where('status', 'L')->count(),
            'total_holiday' => $model->clone()->where('status', 'H')->count(),
            'total_vaccation' => $model->clone()->where('status', 'V')->count(),
            'total_early' => $model->clone()->where('early_going', '!=', '---')->count(),
            'total_late' => $model->clone()->where('late_coming', '!=', '---')->count(),
            "daily_date" => $request->daily_date,
            "report_type" => $this->getStatusText($request->status)
        ];

        $nextDay =  date('Y-m-d', strtotime($request->daily_date . ' + 1 day'));
        $daily_date =  $request->daily_date;

        // $model->take(100);
        $data = $model->get();
        return Pdf::loadView('pdf.mimo', compact("company", "info", "data"));
    }

    public function mimo_daily_pdf(Request $request)
    {
        return  $this->mimo_daily_process($request)->stream("Attendance Report");
    }


    public function mimo_daily_download(Request $request)
    {
        $file_name = "Attendance Report";
        if (isset($request->from_date) && isset($request->to_date)) {
            $file_name = "Attendance Report - " . $request->from_date . ' to ' . $request->to_date;
        }
        $file_name = $file_name . '.pdf';
        return  $this->mimo_daily_process($request)->download($file_name);
    }



    public function process_reports()
    {
        return $company_ids =  Company::pluck('id');
        // $arr = [];
        // foreach ($company_ids as $company_id) {
        //     $arr[] = [
        //         $this->processData($company_id, "daily_summary_report", "SA"),
        //         $this->processData($company_id, "daily_present_report", "P"),
        //         $this->processData($company_id, "daily_absent_report", "A"),
        //         $this->processData($company_id, "daily_missing_report", "M"),
        //         $this->processData($company_id, "daily_manual_entry_report", "ME"),
        //     ];
        // }
        // return $arr;
    }

    public function processData($company_id, $file_name, $status)
    {
        $deptName = '';
        $totEmployees = '';
        $daily_date =  date("Y-m-d");

        $totEmployees = Employee::whereCompanyId($company_id)->whereDate("created_at", "<", $daily_date)->count();

        $deptName = 'All';

        $model = $this->cron_report($company_id, $status);

        $info = (object) [
            'department_name' => $deptName,
            'total_employee' => $totEmployees,
            'total_absent' => $model->clone()->where('status', 'A')->count(),
            'total_present' => $model->clone()->where('status', 'P')->count(),
            'total_missing' => $model->clone()->where('status', '---')->count(),
            'total_leave' => 0,
            'department' => $deptName,
            "daily_date" => $daily_date,
            "report_type" => "Daily"
        ];

        $data = $model->get();

        $company = Company::whereId($company_id)->with('contact')->first(["logo", "name", "company_code", "location", "p_o_box_no", "id"]);

        $pdf =  Pdf::loadView('pdf.attendance_reports.mimo', compact("company", "info", "data"))->output();

        Storage::disk('local')->put("pdf/" . $company_id . '/' . $file_name . '.pdf', $pdf);

        return $file_name  . ' generated successfully';
    }

    public function cron_report($company_id, $status)
    {
        $model = Attendance::query();
        $model->where('company_id', $company_id);
        $model->where('shift_type_id', 2);
        $model = $this->getStatus($model, $status);
        $model->whereDate('date', date("Y-m-d"));
        $model->orderBy("id", "desc");


        // $model->with('shift', function ($q) use ($request) {
        //     $q->where('company_id', $request->company_id);
        // });

        // $model->with('shift_type');


        return $model;
    }

    public function getStatus($model, $status)
    {
        $model->when($status == "P", function ($q) {
            $q->where('status', "P");
        });

        $model->when($status == "A", function ($q) {
            $q->where('status', "A");
        });

        $model->when($status == "M" || $status == "ME", function ($q) {
            $q->where('status', "---");
        });

        return $model;
    }

    public function getNotificationCompanyIds()
    {
        return ReportNotification::distinct("company_id")->pluck("company_id");
    }
}
