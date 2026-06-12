<?php

namespace App\Jobs;

use App\Models\Attendance;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Foundation\Bus\Dispatchable; // <== this is missing!
use Illuminate\Support\Facades\File;

class GenerateAttendanceSummaryReport implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public $shift_type, public $company_id, public $branchId, public $company) {}

    public function handle()
    {
        $company = $this->company;

        $from_date = $company["from_date"] ?? date("Y-m-d");
        $to_date =  $company["to_date"] ?? date("Y-m-d");

        $model = Attendance::query();
        $model->where('company_id', $this->company_id);
        $model->whereBetween("date", [$from_date . " 00:00:00", $to_date . " 23:59:59"]);
        $model->with(['shift_type', 'last_reason', 'branch']);

        $model->whereHas('employee', function ($q) {
            $q->where('company_id', $this->company_id);
            $q->where('branch_id', $this->branchId);
            $q->where('status', 1);
            $q->whereHas("schedule", function ($q) {
                $q->where('company_id', $this->company_id);
            });
        });

        $model->with([
            'employee' => function ($q) {
                $q->where('company_id', $this->company_id)
                    ->where('status', 1)
                    ->select('system_user_id', 'full_name', 'display_name', "department_id", "first_name", "last_name", "profile_picture", "employee_id", "branch_id", "joining_date")
                    ->with(['department', 'branch'])
                    ->with([
                        "schedule" => function ($q) {
                            $q->where('company_id', $this->company_id)
                                ->select("id", "shift_id", "employee_id")
                                ->withOut("shift_type");
                        },
                        "schedule.shift" => function ($q) {
                            $q->where('company_id', $this->company_id)
                                ->select("id", "name", "on_duty_time", "off_duty_time");
                        }
                    ]);
            },
            'device_in' => fn($q) => $q->where('company_id', $this->company_id),
            'device_out' => fn($q) => $q->where('company_id', $this->company_id),
            'shift' => fn($q) => $q->where('company_id', $this->company_id),
            'schedule' => fn($q) => $q->where('company_id', $this->company_id),
        ]);

        $attendances = $model->get();

        $count = count($attendances->toArray());

        echo "\nBranch {$this->branchId}, Total Attendance $count\n";

        if (!$count) return;

        $chunks = $attendances->chunk(15); // Split into groups of 15

        $counter = 1;

        $yesterday = date("Y-m-d", strtotime("-1 day"));

        foreach ($chunks as $chunk) {

            $arr = [
                'shift_type' => $this->shift_type,
                'company' => $company,
                'attendances' => $chunk, // pass pages instead of all attendances
                'counter' => $counter,
            ];

            $data = Pdf::loadView('pdf.attendance_reports.summary', $arr)->output();
            $file_path = "pdf/$yesterday/{$this->company_id}/{$this->branchId}/summary_report_$counter.pdf";
            Storage::disk('local')->put($file_path, $data);

            $counter++;
        }

        // After generating chunked PDFs for each branch:
        $filesDirectory = storage_path("app/pdf/$yesterday/{$this->company_id}/{$this->branchId}");

        if (!is_dir($filesDirectory)) {
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
                $size = $pdf->getTemplateSize($tplId);

                $orientation = ($size['width'] > $size['height']) ? 'L' : 'P';
                $pdf->AddPage($orientation, [$size['width'], $size['height']]);
                $pdf->useTemplate($tplId);
            }
        }

        $relativePath = "public/pdf/$yesterday/{$this->company_id}/summary_report_{$this->branchId}_{$this->shift_type}.pdf";
        
        Storage::put($relativePath, $pdf->Output('', 'S')); // 'S' returns the file as a string

        // // Define merged output path
        // $mergedFilePath = storage_path("app/pdf/$date/{$this->company_id}/summary_report_{$this->branchId}.pdf");
        // // Output the merged file
        // $pdf->Output($mergedFilePath, 'F');


        File::deleteDirectory($filesDirectory);
    }
}
