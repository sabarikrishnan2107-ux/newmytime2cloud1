<?php

namespace App\Http\Controllers\Reports;

use App\Exports\AttendanceExport;
use App\Exports\AttendanceExportGeneral;
use App\Http\Controllers\Controller;
use App\Jobs\GenerateAttendanceReport;
use App\Jobs\GenerateAttendanceReportPDF;
use App\Models\Attendance;
use App\Models\Company;
use App\Models\Device;
use App\Models\Employee;
use App\Models\Roster;
use App\Models\Shift;
use App\Models\ShiftType;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class MonthlyController extends Controller
{
    public $requestPayload;

    public $employeeId;

    public function startReportGeneration(Request $request)
    {
        $requestPayload = [
            'company_id'   => $request->company_id,
            'status'       => "-1",
            'status_slug'  => (new Controller)->getStatusSlug("-1"),
            'from_date'    => $request->from_date,
            'to_date'      => $request->to_date,
            'employee_ids' => $request->input('employee_id', []),
            'template'     => $request->input('report_template'),
        ];

        $companyId    = $requestPayload["company_id"];
        $employee_ids = $requestPayload["employee_ids"];

        $company = Company::whereId($companyId)
            ->with('contact:id,company_id,number')
            ->first(["logo", "name", "company_code", "location", "p_o_box_no", "id"]);

        $totalEmployees = Employee::where("company_id", $companyId)
            ->whereIn("system_user_id", $employee_ids)
            ->count();

        info($totalEmployees);
        info($employee_ids);

        Cache::put("batch_total", $totalEmployees, 1800);
        Cache::put("batch_done", 0, 1800);
        Cache::put("batch_failed", 0, 1800);

        Employee::with(["schedule" => function ($q) use ($companyId) {
            $q->where("company_id", $companyId)
                ->select("id", "shift_id", "shift_type_id", "company_id", "employee_id")
                ->withOut(["shift", "shift_type", "branch"]);
        }])
            ->withOut(["branch", "designation", "sub_department", "user"])
            ->where("company_id", $companyId)
            ->whereIn("system_user_id", $employee_ids)
            ->chunk(50, function ($employees) use ($company, $requestPayload) {

                foreach ($employees as $employee) {

                    GenerateAttendanceReportPDF::dispatch(
                        $employee->system_user_id,
                        $company,
                        $employee,
                        $requestPayload,
                        optional($employee->schedule)->shift_type_id ?? 0,
                        $requestPayload["template"] ?? "Template1"
                    );
                }

                gc_collect_cycles();
            });

        return response()->json([
            'status'  => 'processing',
            'message' => 'Report generation has started.',
        ]);
    }

    public function monthly(Request $request)
    {

        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', 300); // Increase to 5 minutes

        $showTabs = json_decode($request->showTabs, true);

        $shift_type = $showTabs['multi'] == true || $showTabs['double'] == true ? "Multi" : "General";

        $company_id = $request->company_id;

        $from_date = $request->from_date;
        $to_date   = $request->to_date;

        $heading = "Summary";

        $companyPayload = Company::whereId($company_id)
            ->with('contact:id,company_id,number')
            ->first(["logo", "name", "company_code", "location", "p_o_box_no", "id", "user_id"]);

        $company = [
            "logo_raw"    => env("BASE_URL") . '/' . $companyPayload->logo_raw,
            "name"        => $companyPayload->name,
            "email"       => $companyPayload->user->email ?? 'mail not found',
            "location"    => $companyPayload->location,
            "contact"     => $companyPayload->contact->number ?? 'contact not found',
            "report_type" => $heading,
            "from_date"   => $from_date,
            "to_date"     => $to_date,
        ];

        if ($request->report_template == 'Template3') {

            if ($from_date !== $to_date) {
                return "From Date and To Date must be same for (Daily) report";
            }

            return $this->processTemplate3($shift_type, $company_id, $company);
        }

        // only for multi in/out
        // if ($showTabs['multi'] == true || $showTabs['double'] == true) {
        //     return $this->PDFMerge();
        // }
        sleep(5);

        return $this->PDFMerge();
    }

    public function monthly_download_pdf(Request $request)
    {
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', 300); // Increase to 5 minutes

        $showTabs = json_decode($request->showTabs, true);

        $shift_type = $showTabs['multi'] == true || $showTabs['double'] == true ? "Multi" : "General";

        $company_id = $request->company_id;

        $from_date = $request->from_date;
        $to_date   = $request->to_date;

        $heading = "Summary";

        $companyPayload = Company::whereId($company_id)
            ->with('contact:id,company_id,number')
            ->first(["logo", "name", "company_code", "location", "p_o_box_no", "id", "user_id"]);

        $company = [
            "logo_raw"    => env("BASE_URL") . '/' . $companyPayload->logo_raw,
            "name"        => $companyPayload->name,
            "email"       => $companyPayload->user->email ?? 'mail not found',
            "location"    => $companyPayload->location,
            "contact"     => $companyPayload->contact->number ?? 'contact not found',
            "report_type" => $heading,
            "from_date"   => $from_date,
            "to_date"     => $to_date,
        ];

        if ($request->report_template == 'Template3') {

            if ($from_date !== $to_date) {
                return "From Date and To Date must be same for (Daily) report";
            }

            return $this->processTemplate3($shift_type, $company_id, $company, "D");
        }

        // only for multi in/out
        // if ($showTabs['multi'] == true || $showTabs['double'] == true) {
        //     return $this->PDFMerge("D");
        // }

        sleep(5);

        return $this->PDFMerge("D");

        $file_name = "Attendance Report";
        if (isset($request->from_date) && isset($request->to_date)) {
            $file_name = "Attendance Report - " . $request->from_date . ' to ' . $request->to_date;
        }
        $file_name = $file_name . '.pdf';
        $report    = $this->processPDF($request);
        return $report->download($file_name);
    }

    public function custom_request_general($id, $status, $shift_type_id)
    {
        $apiUrl = env('BASE_URL') . '/api/monthly_generate_pdf';

        $queryParams = [
            'report_template' => "Template1",
            'shift_type_id'   => $shift_type_id,
            'report_type'     => 'Monthly',
            'company_id'      => $id,
            'status'          => $status,
            'from_date'       => date('Y-m-d', strtotime('-30 days', time())),
            'to_date'         => date('Y-m-d', strtotime('-1 days', time())),
        ];

        $response = Http::timeout(300)->withoutVerifying()->get($apiUrl, $queryParams);

        if ($response->successful()) {
            return $response->body();
        } else {
            return $response;
            return $this->getMeta("Monthly Report Generate", "Cannot genereate for Company id: $id");
        }
    }

    public function monthly_generate_pdf(Request $request)
    {
        $data = $this->processPDF($request)->output();

        $id = $request->company_id;

        $status = $request->status;

        $file_name = $this->getFileNameByStatus($status);

        $file_path = "pdf/$id/monthly_$file_name.pdf";

        Storage::disk('local')->put($file_path, $data);

        $msg = "Monthly {$this->getStatusText($status)} has been generated for Company id: $id. path: storage/app/$file_path";

        return $this->getMeta("Monthly Report Generate", $msg) . "\n";
    }

    public function getFileNameByStatus($status)
    {
        $arr = [
            "A"  => "absent",
            "M"  => "missing",
            "P"  => "present",
            "O"  => "weekoff",
            "L"  => "leave",
            "H"  => "holiday",
            "V"  => "vaccation",
            "LC" => "latein",
            "EG" => "earlyout",
            "-1" => "summary",
        ];

        return $arr[$status];
    }

    public function multi_in_out_monthly_download_pdf(Request $request)
    {
        if (request("shift_type_id", 0) == 2 || request("shift_type_id", 0) == 5) {
            return $this->PDFMerge();
        }

        $file_name = "Attendance Report";
        if (isset($request->from_date) && isset($request->to_date)) {
            $file_name = "Attendance Report - " . $request->from_date . ' to ' . $request->to_date;
        }
        $file_name = $file_name . '.pdf';
        return $this->processPDF($request)->download($file_name);
    }

    public function multi_in_out_monthly_pdf(Request $request)
    {
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', 300); // Increase to 5 minutes

        if (request("shift_type_id", 0) == 2 || request("shift_type_id", 0) == 5) {
            return $this->PDFMerge();
        }

        // $report = $this->processPDF($request);
        $report    = $this->processPDF($request);
        $file_name = "Attendance Report";
        if (isset($request->from_date) && isset($request->to_date)) {
            $file_name = "Attendance Report - " . $request->from_date . ' to ' . $request->to_date;
        }
        $file_name = $file_name . '.pdf';
        return $report->stream($file_name);
    }

    public function monthly_download_csv(Request $request)
    {
        ini_set('memory_limit', '2048M');
        ini_set('max_execution_time', 600);

        $model = (new Attendance)->processAttendanceModel($request);

        // return $model->get();

        $file_name = "Attendance Report";
        if ($request->filled('from_date') && $request->filled('to_date')) {
            $file_name .= ' - ' . $request->from_date . ' to ' . $request->to_date;
        }

        $file_name = preg_replace('/[^\w\s\-]/', '', $file_name) . '.xlsx';

        if ($request->shift_type_id == 0) {
            return Excel::download(new AttendanceExportGeneral($model), $file_name);
        }

        $colLength = $request->shift_type_id == 2 ? 7 : 2;

        return Excel::download(new AttendanceExport($model, $colLength), $file_name);
    }

    public function processPDF($request)
    {
        // return [$request->from_date, $request->to_date];

        $companyID = $request->company_id;

        $model = (new Attendance)->processAttendanceModel($request);
        $data  = $model->get()->groupBy(['employee_id', 'date']);

        $company                    = Company::whereId($companyID)->with('contact:id,company_id,number')->first(["logo", "name", "company_code", "location", "p_o_box_no", "id"]);
        $company['department_name'] = DB::table('departments')->whereId($request->department_id)->first(["name"])->name ?? '';
        $company['report_type']     = $this->getStatusText($request->status);
        $company['start']           = $request->from_date ?? ''; //date('Y-10-01');
        $company['end']             = $request->to_date ?? '';   //date('Y-10-31');
        $collection                 = $model->clone()->get();

        $info = (object) [
            'total_absent'   => $model->clone()->where('status', 'A')->count(),
            'total_present'  => $model->clone()->where('status', 'P')->count(),
            'total_off'      => $model->clone()->where('status', 'O')->count(),
            'total_missing'  => $model->clone()->where('status', 'M')->count(),
            'total_early'    => $model->clone()->where('early_going', '!=', '---')->count(),
            'total_hours'    => $this->getTotalHours(array_column($collection->toArray(), 'total_hrs')),
            'total_ot_hours' => $this->getTotalHours(array_column($collection->toArray(), 'ot')),
            'report_type'    => $request->report_type ?? "",
            'shift_type_id'  => $request->shift_type_id ?? 0,
            'total_leave'    => 0,
        ];

        // if ($request->employee_id && $request->filled('employee_id')) {
        //     $data = count($data) > 0 ?  $data[$request->employee_id] : [];
        //     return Pdf::loadView('pdf.single-employee',  ['data' => $data, 'company' => $company, 'info' => $info]);
        // }

        $fileName = $request->main_shift_type == 2 ? "multi-in-out" : "general";

        if ($request->from_date == $request->to_date) {
            $fileName = $fileName . "-whatsapp";
        }

        $main_shift_name = 'Single Shift';
        if ($request->main_shift_type == 2) {
            $main_shift_name = 'Multi Shift';
        } else if ($request->main_shift_type == 5) {
            $main_shift_name = 'Double Shift';
        }

        $arr = ['request' => $request, 'data' => $data, 'company' => $company, 'info' => $info, 'main_shift_name' => $main_shift_name];

        //return Pdf::loadView('pdf.attendance_reports.' . $request->report_template, $arr);
        if ($request->report_template == 'Template2') {
            return Pdf::loadView('pdf.attendance_reports.' . $request->report_template, $arr);
        }

        if ($request->report_template == 'Template1') {
            return Pdf::loadView('pdf.attendance_reports.' . $request->report_template . '-' . $fileName, $arr);
        }
    }

    public function getHTML($data, $company)
    {
        $mob         = $company->contact->number ?? '---';
        $companyLogo = "";

        if (env('APP_ENV') !== 'local') {
            $companyLogo = $company->logo;
        } else {
            $companyLogo = getcwd() . "/upload/app-logo.jpeg";
        }

        if ($company->p_o_box_no == "null") {
            $company->p_o_box_no = "---";
        }

        //  <img src="' . getcwd() . '/upload/app-logo.jpeg" height="70px" width="200">
        // <img src="' . $companyLogo . '" height="100px" width="100">      <img src="' . $companyLogo . '" height="100px" width="100">

        return '
        <!DOCTYPE html>
            <html>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <head>
            <style>
            table { font-family: arial, sans-serif; border-collapse: collapse; border: none; width: 100%; }
            td, th { border: 1px solid #eeeeee; text-align: left; }

            th { font-size: 9px; }
            td { font-size: 7px; }

            .page-break { page-break-after: always; }
            .main-table {
                padding-right: 15px;
                padding-left: 15px;
            }
            hr {
                position: relative;
                border: none;
                height: 2px;
                background: #c5c2c2;
                padding: 0px
            }
            .title-font {
                font-family: Arial, Helvetica, sans-serif !important;
                font-size: 14px;
                font-weight: bold
            }

            .summary-header th {
                font-size: 10px
            }

            .summary-table td {
                font-size: 9px
            }

            footer {
                bottom: 0px;
                position: absolute;
                width: 100%;
            }

            #footer {
                position: fixed;
                top: 720px;
                right: 0px;
                bottom: 0px;
                text-align: center;
                font-size: 12px;
            }

            #page-bottom-line {
                position: fixed;
                right: 0px;
                bottom: -14px;
                text-align: center;
                font-size: 12px;
                counter-reset: pageTotal;

            }

            .pageCounter span {
                counter-increment: pageTotal;
            }

            #pageNumbers div:before {
                counter-increment: currentPage;
                content: "Page "counter(currentPage) " of ";
            }

            #pageNumbers div:after {
                content: counter(pageTotal);
            }
            @page {
                margin: 20px 30px 40px 50px;
            }

            .footer-main-table {
                padding-bottom: -100px;
                padding-top: -50px;
                padding-right: 15px;
                padding-left: 15px;
            }

            .main-table {
                padding-bottom: 0px;
                padding-top: 0px;
                padding-right: 15px;
                padding-left: 15px;
            }

        </style>
            </head>
            <body>

            <table style="margin-top: -20px !important;backgroundd-color:blue;padding-bottom:0px ">
            <tr>
                <td style="text-align: left;width: 300px; border :none; padding:15px;   backgrozund-color: red">
                    <div style="img">
                    <img src="' . $companyLogo . '" height="100px" width="100">
                    </div>
                </td>
                <td style="text-align: left;width: 333px; border :none; padding:15px; backgrozusnd-color:blue">
                    <div>
                        <table style="text-align: left; border :none;  ">
                            <tr style="text-align: left; border :none;">
                                <td style="text-align: center; border :none">
                                    <span class="title-font">
                                    Monthly Attendance ' . $company->report_type . ' Report
                                    </span>
                                    <hr style="width: 230px">
                                </td>
                            </tr>
                            <tr style="text-align: left; border :none;">
                                <td style="text-align: center; border :none">
                                    <span style="font-size: 11px">
                                    ' . date('d M Y', strtotime($company->start)) . ' - ' . date('d M Y', strtotime($company->end)) . ' <br>
                                       <small> Department : ' . ($company->department_name ?? '---') . '</small>
                                    </span>
                                    <hr style="width: 230px">
                                </td>
                            </tr>
                        </table>
                    </div>
                </td>
                <td style="text-align: right;width: 300px; border :none; backgrodund-color: red">


                    <table class="summary-table"
                    style="border:none; padding:0px 50px; margin-left:35px;margin-top:20px;margin-bottom:0px">
                    <tr style="text-align: left; border :none;">
                        <td style="text-align: right; border :none;font-size:10px">
                            <b>
                            ' . $company->name . '
                            </b>
                            <br>
                        </td>
                    </tr>
                    <tr style="text-align: left; border :none;">
                        <td style="text-align: right; border :none;font-size:10px">
                            <span style="margin-right: 3px"> P.O.Box: ' . ($company->p_o_box_no ?? '---') . ' </span>
                            <br>
                        </td>
                    </tr>
                    <tr style="text-align: left; border :none;">
                        <td style="text-align: right; border :none;font-size:10px">
                            <span style="margin-right: 3px">' . ($company->location ?? '---') . '</span>
                            <br>
                        </td>
                    </tr>
                    <tr style="text-align: left; border :none;">
                        <td style="text-align: right; border :none;font-size:10px">
                            <span style="margin-right: 3px"> Tel: ' . $mob . ' </span>
                            <br>
                        </td>
                    </tr>
                </table>

                    <br>
                </td>
                </td>
            </tr>
        </table>
            <hr style="margin:0px;padding:0">
            <div id="footer">
            <div class="pageCounter">
                <p></p>
                ' . $this->getPageNumbers($data) . '
            </div>
            <div id="pageNumbers" style="font-size: 9px;margin-top:5px">
                <div class="page-number"></div>
            </div>
            </div>
            <br>
            <br>
            <footer id="page-bottom-line" style="margin-top: 20000px!important;">
            <hr style="width: 100%;margin-top: 10px!important">
            <table class="footer-main-table" >
                <tr style="border :none;">
                    <td style="text-align: left;border :none;font-size:9px"><b>Device</b>: Main Entrance = MED, Back Entrance = BED</td>
                    <td style="text-align: left;border :none;font-size:9px"><b>Shift Type</b>: Manual = MA, Auto = AU, NO = NO</td>
                    <td style="text-align: left;border :none;font-size:9px"><b>Shift</b>: Morning = Mor, Evening = Eve, Evening2 = Eve2
                    </td>
                    <td style="text-align: right;border :none;font-size:9px">
                        <b>Powered by</b>: <span style="color:blue"> www.ideahrms.com</span>
                    </td>
                    <td style="text-align: right;border :none;font-size:9px">
                        Printed on :  ' . date("d-M-Y ") . '
                    </td>
                </tr>
            </table>
        </footer>
            ' . $this->renderTable($data, $company) . '
        </body>
    </html>';
    }

    public function renderTable($data, $company)
    {
        $str            = "";
        $model          = Device::query();
        $shiftModel     = Shift::query();
        $shiftTypeModel = ShiftType::query();
        $rosterModel    = Roster::query();

        foreach ($data as $eid => $row) {

            $emp = Employee::where("employee_id", $eid)->whereCompanyId($company->id)->first();

            $str .= '<div class="page-breaks">';

            $str .= '<table class="main-table" style="margin-top: 10px !important;">';
            $str .= '<tr style="text-align: left; border :1px solid black; width:120px;">';
            $str .= '<td style="text-align:left;width:120px"><b>Name</b>:' . ($emp->display_name ?? ' ---') . '</td>';
            $str .= '<td style="text-align:left;width:120px"><b>EID</b>:' . $emp->employee_id ?? '' . '</td>';
            $str .= '<td style="text-align:left;width:120px"><b>Total Hrs</b>:' . $this->getCalculation($row)['work'] . '</td>';
            $str .= '<td style="text-align:left;width:120px"><b>OT</b>:' . $this->getCalculation($row)['ot'] . '</td>';
            $str .= '<td style="text-align:left;color:green;width:150px"><b>Present</b>:' . ($this->getCalculation($row)['presents']) . '</td>';
            $str .= '<td style="text-align:left;color:red;width:150px"><b>Absent</b>:' . ($this->getCalculation($row)['absents']) . '</td>';
            $str .= '<td style="text-align:left;color:orange"><b>Missing</b>:' . ($this->getCalculation($row)['missings']) . '</td>';
            $str .= '<td style="text-align:left;width:120px;"><b>Manual</b>:' . ($this->getCalculation($row)['manuals']) . '</td>';
            $str .= '</tr>';
            $str .= '</table>';

            $str .= '<table class="main-table" style="margin-top: 5px !important;  padding-bottom: 1px;">';

            $dates  = '<tr"><td><b>Dates</b></td>';
            $days   = '<tr"><td><b>Days</b></td>';
            $in     = '<tr"><td><b>In</b></td>';
            $out    = '<tr"><td><b>Out</b></td>';
            $work   = '<tr"><td><b>Work</b></td>';
            $ot     = '<tr"><td><b>OT</b></td>';
            $roster = '<tr"><td><b>Roster</b></td>';
            // $shift_type = '<tr "><td><b>Shift Type</b></td>';
            // $din = '<tr"><td><b>Device In</b></td>';
            // $dout = '<tr"><td><b>Device Out</b></td>';
            $status_tr = '<tr"><td><b>Status</b></td>';

            foreach ($row as $key => $record) {

                // dd($record[0]['roster_id']);
                if ($record[0]['roster_id'] != '---') {
                    $roster_name = $rosterModel->where("id", $record[0]['roster_id'])->first()->name ?? "";
                } else {
                    $roster_name = '---';
                }

                if ($record[0]['shift_id'] != '---') {
                    $shift_name = $shiftModel->where("id", $record[0]['shift_id'])->first()->name ?? "";
                } else {
                    $shift_name = '---';
                }

                if ($record[0]['shift_type_id'] != '---') {
                    $shift_type_name = $shiftTypeModel->where("id", $record[0]['shift_type_id'])->first()->name ?? '';
                } else {
                    $shift_type_name = '---';
                }

                // $shift_name =  $shiftModel->where("id", $record[0]['shift_id'])->first()->name ?? '';
                // $shift_type_name =  $shiftTypeModel->where("id", $record[0]['shift_type_id'])->first()->name ?? '';

                $device_short_name_in  = $model->clone()->where("device_id", $record[0]['device_id_in'])->first()->short_name ?? '';
                $device_short_name_out = $model->clone()->where("device_id", $record[0]['device_id_out'])->first()->short_name ?? '';

                $dates .= '<td style="text-align: center;"> ' . substr($key, 0, 2) . ' </td>';
                $days .= '<td style="text-align: center;"> ' . $record[0]['day'] . ' </td>';

                $in .= '<td style="text-align: center;"> ' . $record[0]['in'] . ' </td>';
                $out .= '<td style="text-align: center;"> ' . $record[0]['out'] . ' </td>';

                $work .= '<td style="text-align: center;"> ' . $record[0]['total_hrs'] . ' </td>';
                $ot .= '<td style="text-align: center;"> ' . $record[0]['ot'] . ' </td>';

                $roster .= '<td style="text-align: center;"> ' . $roster_name . ' </td>';
                // $shift_type .= '<td style="text-align: center;"> ' . $shift_type_name . ' </td>';
                // $din .= '<td style="text-align: center;"> ' . $device_short_name_in . ' </td>';
                // $dout .= '<td style="text-align: center;"> ' . $device_short_name_out . ' </td>';

                $status = $record[0]['status'] == 'A' ? 'red' : 'green';

                $status_tr .= '<td style="text-align: center; color:' . $status . '"> ' . $record[0]['status'] . ' </td>';
            }

            $dates .= '</tr>';
            $days .= '</tr>';
            $in .= '</tr>';
            $out .= '</tr>';
            $work .= '</tr>';
            $ot .= '</tr>';
            $roster .= '</tr>';
            // $shift_type .= '</tr>';
            // $din .= '</tr>';
            // $dout .= '</tr>';
            $status_tr .= '</tr>';

            // $str = $str . $dates . $days . $in . $out . $work . $ot . $shift . $shift_type . $din . $dout . $status_tr;
            $str = $str . $dates . $days . $in . $out . $work . $ot . $roster . $status_tr;

            $str .= '</table>';
            $str .= '</div>';
        }
        return $str;
    }

    public function getCalculation($arr)
    {
        $work_minutes = 0;
        $ot_minutes   = 0;

        $presents = 0;
        $absents  = 0;
        $missings = 0;
        $manuals  = 0;

        foreach ($arr as $a) {
            $status = $a[0]->status;
            $work   = $a[0]->total_hrs;
            $ot     = $a[0]->ot;

            if ($status == 'P') {
                $presents++;
            } else if ($status == 'A') {
                $absents++;
            } else if ($status == 'ME') {
                $missings++;
            } else if ($status == '---') {
                $manuals++;
            }

            if ($work != '---') {
                list($work_hour, $work_minute) = explode(':', $work);
                $work_minutes += $work_hour * 60;
                $work_minutes += $work_minute;
            }

            if ($ot != '---' && $ot != 'NA') {
                list($ot_hour, $ot_minute) = explode(':', $ot);
                $ot_minutes += $ot_hour * 60;
                $ot_minutes += $ot_minute;
            }
        }

        $work_hours = floor($work_minutes / 60);
        $work_minutes -= $work_hours * 60;

        $ot_hours = floor($ot_minutes / 60);
        $ot_minutes -= $ot_hours * 60;

        return [
            'work'     => $work_hours . ':' . $work_minutes,
            'ot'       => $ot_hours . ':' . $ot_minutes,
            'presents' => $presents,
            'absents'  => $absents,
            'missings' => $missings,
            'manuals'  => $manuals,
        ];
    }

    public function getPageNumbers($data)
    {
        $p   = count($data);
        $str = '';
        $l   = $p / 4;
        if ($p <= 3) {
            $str .= '<span></span>';
        } else if ($p <= 5) {
            $str .= '<span></span><span></span>';
        } else {
            for ($a = 1; $a <= $l; $a++) {
                $str .= '<span></span>';
            }
        }
        return $str;
    }

    public function getTotalHours($times)
    {
        $sum_minutes = 0;
        foreach ($times as $time) {
            if ($time != "---") {
                $parts   = explode(":", $time);
                $hours   = intval($parts[0]);
                $minutes = intval($parts[1]);
                $sum_minutes += $hours * 60 + $minutes;
            }
        }
        $work_hours = floor($sum_minutes / 60);
        $sum_minutes -= $work_hours * 60;
        return $work_hours . ':' . $sum_minutes;
    }

    public function csvPdf()
    {
        $first = true;
        $file  = fopen(public_path('transactions.csv'), 'r');
        $data  = [];

        // 0 => "﻿Employee ID"
        // 1 => "First Name"
        // 2 => "Department"
        // 3 => "Date"
        // 4 => "Time"
        // 5 => "Punch State"
        // 6 => "Work Code"
        // 7 => "Area Name"
        // 8 => "Serial Number"
        // 9 => "Device Name"
        // 10 => "Upload Time"

        while (($line = fgetcsv($file)) !== false) {
            if ($first) {
                $first = false;
            } else {

                $data[] = [
                    'employee_id' => $line[0],
                    'first_name'  => $line[1],
                    'department'  => $line[2],
                    'date'        => $line[3],
                    'time'        => $line[4],
                    'punch_state' => $line[5],
                    'work_code'   => $line[6],
                    'area_name'   => $line[7],
                    'serial_no'   => $line[8],
                    'device_name' => $line[9],
                    'upload_time' => $line[10],
                ];
            }
            // $data[] = $line;
        }
        fclose($file);
        // return $data;
        return Pdf::loadView('pdf.csv', compact('data'))->stream();
    }

    public function PDFGeneration()
    {

        ini_set('memory_limit', '512M'); // Adjust to the required value

        set_time_limit(60);

        $requestPayload = [
            'company_id'  => 22,
            'status'      => "-1",
            'date'        => date("Y-m-d", strtotime("-1 day")), // Yesterday's date
            "status_slug" => $this->getStatusSlug("-1"),
        ];

        $this->requestPayload = $requestPayload;

        $employees = Employee::whereCompanyId($requestPayload["company_id"])->take(100)->get();

        $totalEmployees = $employees->count();

        $company                = Company::whereId($requestPayload["company_id"])->with('contact:id,company_id,number')->first(["logo", "name", "company_code", "location", "p_o_box_no", "id"]);
        $company['report_type'] = $this->getStatusText($requestPayload['status']);

        // Dont use in production -----------------------------------------------------------------------
        DB::table("jobs")->truncate();
        DB::table("failed_jobs")->truncate();
        // Dont use in production -----------------------------------------------------------------------

        foreach ($employees as $index => $employee) {

            $employeeId       = $employee->system_user_id;
            $this->employeeId = $employee->system_user_id;

            // $company_id = $this->requestPayload["company_id"];
            // $date = $this->requestPayload["date"];
            // $status_slug = $this->requestPayload["status_slug"];

            // $model = $this->getModel($requestPayload);

            // $data = $model->get();

            // $collection = $model->clone()->get();

            // $info = (object) [
            //     'total_absent' => $model->clone()->where('status', 'A')->count(),
            //     'total_present' => $model->clone()->where('status', 'P')->count(),
            //     'total_off' => $model->clone()->where('status', 'O')->count(),
            //     'total_missing' => $model->clone()->where('status', 'M')->count(),
            //     'total_leave' => $model->clone()->where('status', 'L')->count(),
            //     'total_holiday' => $model->clone()->where('status', 'H')->count(),
            //     'total_early' => $model->clone()->where('early_going', '!=', '---')->count(),
            //     'total_hours' => $this->getTotalHours(array_column($collection->toArray(), 'total_hrs')),
            //     'total_ot_hours' => $this->getTotalHours(array_column($collection->toArray(), 'ot')),
            //     'total_leave' => 0,
            // ];

            // $arr = [
            //     'data' => $data,
            //     'company' => $company,
            //     'info' => $info,
            //     "employee" => $employee
            // ];

            // $template = "Template1";

            // $filesPath = public_path("reports/companies/$company_id/$date/$status_slug/$template");

            // if (!file_exists($filesPath)) {
            //     mkdir($filesPath, 0777, true);
            // }

            // return $output = Pdf::loadView("pdf.attendance_reports.$template-multi-new", $arr)->stream();

            // $file_name = "$employeeId.pdf";

            // file_put_contents($filesPath . '/' . $file_name, $output);

            GenerateAttendanceReport::dispatch($index + 1, $employeeId, $company, $employee, $requestPayload, $totalEmployees);
        }

        return "Report generating in background. will be available after few minutes on PDF TAB";
    }

    public function getModel($requestPayload)
    {

        $model = Attendance::query();

        $model->where('company_id', $requestPayload["company_id"]);

        $model->with(['shift_type', 'last_reason', 'branch']);

        if (! empty($requestPayload["status"])) {
            if ($requestPayload["status"] != "-1") {
                $model->where('status', $requestPayload["status"]);
            }

            if ($requestPayload["status"] == "ME") {
                $model->where('is_manual_entry', true);
            }

            if ($requestPayload["status"] == "LC") {
                $model->where('late_coming', "!=", "---");
            }

            if ($requestPayload["status"] == "EG") {
                $model->where('early_going', "!=", "---");
            }

            if ($requestPayload["status"] == "OT") {
                $model->where('ot', "!=", "---");
            }
        }

        $model->whereHas('employee', function ($q) {
            $q->where('company_id', $this->requestPayload["company_id"]);
            $q->where('status', 1);
            $q->select('system_user_id', 'display_name', "department_id", "first_name", "last_name", "profile_picture", "employee_id", "branch_id");
            $q->with(['department', 'branch']);
        });

        $model->with([
            'employee' => function ($q) {
                $q->where('company_id', $this->requestPayload["company_id"]);
                $q->where('status', 1);
                $q->select('system_user_id', 'full_name', 'display_name', "department_id", "first_name", "last_name", "profile_picture", "employee_id", "branch_id");
                $q->with(['department', 'branch']);
            },
        ]);

        $model->with('device_in', function ($q) {
            $q->where('company_id', $this->requestPayload["company_id"]);
        });

        $model->with('device_out', function ($q) {
            $q->where('company_id', $this->requestPayload["company_id"]);
        });

        $model->with('shift', function ($q) {
            $q->where('company_id', $this->requestPayload["company_id"]);
        });

        $model->with('schedule', function ($q) {
            $q->where('company_id', $this->requestPayload["company_id"]);
        });

        $model->whereDoesntHave('device_in', fn($q) => $q->where('device_type', 'Access Control'));

        $model->whereDoesntHave('device_out', fn($q) => $q->where('device_type', 'Access Control'));

        $model->where('employee_id', $this->employeeId);

        $model->whereBetween('date', [date("Y-m-01"), date("Y-m-31")]);

        $model->orderBy('date', 'asc');

        return $model;
    }

    public function PDFMerge($action = "I")
    {

        $employeeIds = [];

        $company_id = request("company_id", 0);

        $employee_id = request("employee_id", 0);

        if (! empty($employee_id)) {
            $employeeIds = is_array($employee_id) ? $employee_id : explode(",", $employee_id);
        }

        // if (count($employeeIds) > 100) {
        //     return 'Only 100 Employee allowed';
        // }

        $template = request("report_template", 0);

        $filesDirectory = public_path("reports/$company_id/$template");

        // Check if the directory exists
        if (! is_dir($filesDirectory)) {
            return response()->json(['error' => 'Directory not found'], 404);
        }

        $pdfFiles = glob($filesDirectory . '/*.pdf');

        if (count($employeeIds)) {
            $pdfFiles = [];
            foreach ($employeeIds as $value) {
                $fileName = "Attendance_Report_{$template}_{$value}.pdf";
                $filePath = $filesDirectory . DIRECTORY_SEPARATOR . $fileName;

                if (glob($filePath)) {
                    $pdfFiles[] = glob($filePath)[0];
                }
            }
        }
        // Get all PDF files in the directory

        $from_date = request("from_date", date("Y-m-d"));
        $to_date   = request("to_date", date("Y-m-d"));

        $file_name = "Attendance Report - "
            . Carbon::parse($from_date)->format('d M Y')
            . " to "
            . Carbon::parse($to_date)->format('d M Y')
            . ".pdf";

        if (empty($pdfFiles)) {
            return 'No PDF files found';
        }
        if ($action == "I") {
            return (new Controller)->mergePdfFiles($pdfFiles, $action, $file_name);
        }

        return (new Controller)->mergePdfFiles($pdfFiles, $action, $file_name);
    }

    public function processTemplate3($shift_type, $company_id, $company, $action = "I")
    {

        $from_date = $company["from_date"] ?? date("Y-m-d");
        $to_date   = $company["to_date"] ?? date("Y-m-d");

        $model = Attendance::query();
        $model->where('company_id', $company_id);
        $model->whereBetween("date", [$from_date . " 00:00:00", $to_date . " 23:59:59"]);
        $model->with(['shift_type', 'last_reason', 'branch']);

        $model->whereHas('employee', function ($q) use ($company_id) {
            $q->where('company_id', $company_id);
            $q->where('status', 1);
            $q->whereHas("schedule", function ($q) use ($company_id) {
                $q->where('company_id', $company_id);
            });
        });

        $model->with([
            'employee'   => function ($q) use ($company_id) {
                $q->where('company_id', $company_id)
                    ->where('status', 1)
                    ->select('system_user_id', 'full_name', 'display_name', "department_id", "first_name", "last_name", "profile_picture", "employee_id", "branch_id", "joining_date")
                    ->with(['department', 'branch'])
                    ->with([
                        "schedule"       => function ($q) use ($company_id) {
                            $q->where('company_id', $company_id)
                                ->select("id", "shift_id", "employee_id")
                                ->withOut("shift_type");
                        },
                        "schedule.shift" => function ($q) use ($company_id) {
                            $q->where('company_id', $company_id)
                                ->select("id", "name", "on_duty_time", "off_duty_time");
                        },
                    ]);
            },
            'device_in'  => fn($q)  => $q->where('company_id', $company_id),
            'device_out' => fn($q) => $q->where('company_id', $company_id),
            'shift'      => fn($q)      => $q->where('company_id', $company_id),
            'schedule'   => fn($q)   => $q->where('company_id', $company_id),
        ]);

        $attendances = $model->get();

        $count = count($attendances->toArray());

        if (! $count) {
            return;
        }

        $chunks = $attendances->chunk(15); // Split into groups of 15

        $counter = 1;

        $yesterday = date("Y-m-d", strtotime("-1 day"));

        foreach ($chunks as $chunk) {

            $arr = [
                'shift_type'  => $shift_type,
                'company'     => $company,
                'attendances' => $chunk, // pass pages instead of all attendances
                'counter'     => $counter,
            ];

            $data      = Pdf::loadView('pdf.attendance_reports.summary', $arr)->output();
            $file_path = "pdf/$yesterday/{$company_id}/summary_report_$counter.pdf";
            Storage::disk('local')->put($file_path, $data);

            $counter++;
        }

        // After generating chunked PDFs for each branch:
        $filesDirectory = storage_path("app/pdf/$yesterday/{$company_id}");

        if (! is_dir($filesDirectory)) {
            echo 'Directory not found';
        }

        $pdfFiles = glob($filesDirectory . '/*.pdf');

        if (empty($pdfFiles)) {
            echo 'No PDF files found';
        }

        $pdf = new \setasign\Fpdi\Fpdi();

        foreach ($pdfFiles as $file) {
            $pageCount = $pdf->setSourceFile($file);

            for ($i = 1; $i <= $pageCount; $i++) {
                $tplId = $pdf->importPage($i);
                $size  = $pdf->getTemplateSize($tplId);

                $orientation = ($size['width'] > $size['height']) ? 'L' : 'P';
                $pdf->AddPage($orientation, [$size['width'], $size['height']]);
                $pdf->useTemplate($tplId);
            }
        }

        File::deleteDirectory($filesDirectory);

        if ($action == "I") {
            return $pdf->Output();
        }

        return response($pdf->Output("report.pdf", $action = "D"))->header('Content-Type', 'application/pdf');
    }
}
