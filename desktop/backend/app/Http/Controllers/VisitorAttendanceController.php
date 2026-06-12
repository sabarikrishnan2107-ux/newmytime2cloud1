<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Company;
use App\Models\VisitorAttendance;
use App\Models\VisitorLog;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class VisitorAttendanceController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        return (new VisitorAttendance)->processVisitorModel($request)->paginate($request->per_page ?? 100);
    }

    // public function visitor_log_list(VisitorLog $model, Request $request)
    // {
    //     return $model->with("device")->where('UserID', $request->UserID)

    //         ->where('company_id', $request->company_id)
    //         ->whereDate('LogTime', $request->LogTime)
    //         ->select("LogTime", "DeviceID")
    //         ->distinct("LogTime")
    //         ->orderBy('LogTime', "asc")
    //         ->paginate($request->per_page ?? 100);
    // }

    public function visitor_log_list(AttendanceLog $model, Request $request)
    {
        return $model->with("device")->where('UserID', $request->UserID)

            ->where('company_id', $request->company_id)
            ->whereDate('LogTime', $request->LogTime)
            ->select("LogTime", "DeviceID")
            ->distinct("LogTime")
            ->orderBy('LogTime', "asc")
            ->paginate($request->per_page ?? 100);
    }

    public function report(Request $request)
    {
        $data = $this->processData($request);

        return match ($request->action) {
            "print" => $data["pdf"]->stream(),
            "download" => $data["pdf"]->download(),
            "csv" => $this->csv($request),
            default => $data["json"],
        };
    }

    public function processData($request)
    {
        $data = (new VisitorAttendance)->processVisitorModel($request)->get();

        $fileName = ($request->frequency !== "Daily") ? "general" : "daily";

        $final_data = ["data" => $data, "info" => $this->prepareInfoData($request)];

        $reponse = [];

        if ($request->action == "json") {
            $reponse["json"] =  $final_data;
        }

        $reponse["pdf"] =  Pdf::loadView("pdf.visitor.$fileName", $final_data);

        return $reponse;
    }

    public function csv($request)
    {
        $data = (new VisitorAttendance)->processVisitorModel($request)->get();

        $fileName = 'report.csv';

        $headers = array(
            "Content-type" => "text/csv",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0",
        );

        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');

            $i = 0;

            fputcsv($file, ["#", "Date", "V.ID", "Full Name", "Status", "In", "Out", "Total Hrs", "D.In", "D.Out"]);
            foreach ($data as $col) {
                fputcsv($file, [
                    ++$i,
                    $col['date'],
                    $col['visitor_id'] ?? "---",
                    $col['visitor']["full_name"] ?? "---",
                    $col["status"] ?? "---",
                    $col["in"] ?? "---",
                    $col["out"] ?? "---",
                    $col["total_hrs"] ?? "---",
                    $col["device_in"]["short_name"] ?? "---",
                    $col["device_out"]["short_name"] ?? "---",
                ], ",");
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function prepareInfoData($request)
    {
        $data = [];
        $data['company'] = Company::find($request->company_id)->toArray() ?? "";
        $data['daily_date'] = date('d-M-Y', strtotime($request->daily_date));
        $data['from_date'] = date('d-M-Y', strtotime($request->from_date));
        $data['to_date'] = date('d-M-Y', strtotime($request->to_date));
        $data['frequency'] = $request->frequency ?? "";
        $data['per_page'] = $request->per_page ?? 25;
        $data['status'] = $request->status ?? "";
        return $data;
    }


    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */

    public function store(Request $request)
    {
        // return $this->syncVisitorsCron();

        return $this->syncVisitorScript($request->company_id, $request->date, $request->UserID);
    }

    public function syncVisitorsCron()
    {
        $date = date("Y-m-d");

        $model = VisitorLog::query();

        $model->whereDate("LogTime", $date);

        $data = $model->distinct("UserID")->get(["UserID", "company_id"]);

        $reponse = "";

        foreach ($data as $d) {

            $reponse .= $this->getMeta("Sync Visitor", $this->syncVisitorScript($d->company_id, $date, $d->UserID) . "\n");
        }

        return $reponse;
    }

    public function syncVisitorScript($company_id, $date, $UserID)
    {
        $model = VisitorLog::query();

        $model->whereDate("LogTime", $date);
        $model->where("company_id", $company_id);
        $model->where("UserID", $UserID);

        $model = $model->distinct("LogTime");

        $count = $model->count();

        $data = [$model->clone()->orderBy("LogTime")->first()];

        if ($count > 1) {
            $data[] = $model->orderBy("LogTime", "desc")->first();
        }

        if (!$count) {
            return "Company Id: " . $company_id . " Visitor with $UserID SYSTEM USER ID has no Log(s)";

            return $this->response("Visitor with $UserID SYSTEM USER ID has no Log(s).", null, false);
        }

        $arr = [];
        $arr["company_id"] = $company_id;
        $arr["date"] = $date;
        $arr["visitor_id"] = $UserID;
        $arr["device_id_in"] = $data[0]["DeviceID"];
        $arr["in"] = date("H:i", strtotime($data[0]["LogTime"]));
        $arr["status"] = "Approved";


        if ($count > 1) {
            $arr["device_id_out"] = $data[1]["DeviceID"];
            $arr["out"] = date("H:i", strtotime($data[1]["LogTime"]));
            $arr["total_hrs"] = $this->getTotalHrsMins(date("H:i", strtotime($data[0]["LogTime"])), date("H:i", strtotime($data[1]["LogTime"])));
        }

        return $this->storeOrUpdate($arr);
    }

    public function storeOrUpdate($items)
    {
        try {

            $attendance = VisitorAttendance::firstOrNew([
                'date' => $items['date'],
                'visitor_id' => $items['visitor_id'],
                'company_id' => $items['company_id'],
            ]);

            $attendance->fill($items)->save();
            return "Company Id: " . $items['company_id'] . " The Logs has been render against " . $items['visitor_id'] . " SYSTEM USER ID.";
            return $this->response("The Logs has been render against " . $items['visitor_id'] . " SYSTEM USER ID.", null, true);
        } catch (\Exception $e) {
            return "Company Id: " . $items['company_id'] . " The Logs cannnot render against " . $items['visitor_id'] . " SYSTEM USER ID.";
            return $this->response("The Logs cannnot render against " . $items['visitor_id'] . " SYSTEM USER ID.", null, false);
        }
    }
}
