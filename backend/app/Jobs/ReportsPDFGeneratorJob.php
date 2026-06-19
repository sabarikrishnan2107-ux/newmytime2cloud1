<?php

namespace App\Jobs;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Company;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;
use Webklex\PDFMerger\Facades\PDFMergerFacade as PDFMerger;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;

class ReportsPDFGeneratorJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    // protected $folder_name;
    // protected $blade_name;
    // protected $data;
    // protected $system_user_id;
    protected $folder_name;
    protected $key;
    protected $data;
    protected $request;
    protected  $model;


    /**
     * Create a new job instance.
     *
     * @return void
     */
    //public function __construct($request, $folder_name, $blade_name, $data, $system_user_id)

    public function __construct($folder_name,  $data, $key, $request)
    {
        $this->folder_name = $folder_name;
        $this->key = $key;
        $this->data = $data;
        $this->request = $request;
        //$this->model = serialize($model);
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $file_path = '';
        try {


            $this->model = (new Attendance())->processAttendanceModelPDFJob($this->request);

            $data  =  $this->data;


            $company = Company::whereId($this->request->company_id)->with('contact:id,company_id,number')->first(["logo", "name", "company_code", "location", "p_o_box_no", "id"]);
            $company['department_name'] = DB::table('departments')->whereId($this->request->department_id)->first(["name"])->name ?? '';
            $company['report_type'] = $this->getStatusText($this->request->status);
            $company['start'] = $this->request->from_date ?? ''; //date('Y-10-01');
            $company['end'] = $this->request->to_date ??  ''; //date('Y-10-31');
            $collection = $this->model->clone()->get();

            $info = (object) [
                'total_absent' => $this->model->clone()->where('status', 'A')->count(),
                'total_present' => $this->model->clone()->where('status', 'P')->count(),
                'total_off' => $this->model->clone()->where('status', 'O')->count(),
                'total_missing' => $this->model->clone()->where('status', 'M')->count(),
                'total_early' => $this->model->clone()->where('early_going', '!=', '---')->count(),
                'total_hours' => $this->getTotalHours(array_column($collection->toArray(), 'total_hrs')),
                'total_ot_hours' => $this->getTotalHours(array_column($collection->toArray(), 'ot')),
                'report_type' => $this->request->report_type ?? "",
                'shift_type_id' => $this->request->shift_type_id ?? 0,
                'total_leave' => 0,
            ];



            $fileName = $this->request->main_shift_type == 2 ? "multi-in-out" : "general";

            if ($this->request->from_date == $this->request->to_date) {
                $fileName =  $fileName . "-whatsapp";
            }

            $main_shift_name = 'Single Shift';
            if ($this->request->main_shift_type == 2)
                $main_shift_name = 'Multi Shift';
            else   if ($this->request->main_shift_type == 5)
                $main_shift_name = 'Double Shift';


            $arr = ['request' => $this->request, 'data' => $data, 'company' => $company, 'info' => $info, 'main_shift_name' => $main_shift_name];



            $que_job_blade_name = '';
            $que_job_data = '';
            if ($this->request->report_template == 'Template2') {
                $file_path = "temp_pdf/" . $this->folder_name . "/" . $this->key . ".pdf";
                $data_pdf = Pdf::loadView('pdf.attendance_reports_updated.' . $this->request->report_template, $arr)->output();
                Storage::disk('public')->put($file_path, $data_pdf);

                unset($data_pdf);

                $que_job_blade_name = 'pdf.attendance_reports_updated.' . $this->request->report_template;
                $que_job_data = $arr;
            }
            if ($this->request->report_template == 'Template1') { {
                    $file_path =   "temp_pdf/" . $this->folder_name . "/" . $this->key . ".pdf";
                    $data_pdf = Pdf::loadView('pdf.attendance_reports_updated.' . $this->request->report_template . '-' . $fileName, $arr)->output();
                    Storage::disk('public')->put($file_path, $data_pdf);
                    unset($data_pdf);

                    $que_job_blade_name = 'pdf.attendance_reports_updated.' . $this->request->report_template . '-' . $fileName;
                    $que_job_data = $arr;
                }
            }







            // $file_path =   "temp_pdf/" . $this->folder_name . "/" . $this->system_user_id . ".pdf";
            // $data_pdf = Pdf::loadView($this->blade_name,  $this->data)->output();
            // Storage::disk('public')->put($file_path, $data_pdf);
            // $data_pdf = null;
            // $file_name_raw = "jobs_pdf/jobs_pdf_" . date("d-m-Y") . ".txt";
            // Storage::append($file_name_raw, json_encode($file_path) . ' - Generated Successfully');
            // echo  $file_path;
        } catch (\Exception $e) {
            $file_name_raw = "jobs_pdf/jobs_pdf_error_" . date("d-m-Y") . ".txt";
            Storage::append($file_name_raw,  $file_path  . ' - ' . $e->getFile() . ' - ' . $e->getMessage() . ' ---Line:  ' . $e->getLine());

            echo   $e->getMessage();
        }
    }
    public function getStatusText($status)
    {
        $arr = [
            "All" => "All",
            "A" => "Absent",
            "M" => "Missing",
            "P" => "Present",
            "O" => "Week Off",
            "L" => "Leave",
            "H" => "Holiday",
            "V" => "Vaccation",
            "LC" => "Late In",
            "EG" => "Early Out",
            "-1" => "Summary"
        ];

        return $arr[$status];
    }

    public function getTotalHours($times)
    {
        $sum_minutes = 0;
        foreach ($times as $time) {
            if ($time != "---") {
                $parts = explode(":", $time);
                $hours = intval($parts[0]);
                $minutes = intval($parts[1]);
                $sum_minutes += $hours * 60 + $minutes;
            }
        }
        $work_hours = floor($sum_minutes / 60);
        $sum_minutes -= $work_hours * 60;
        return $work_hours . ':' . $sum_minutes;
    }
}
