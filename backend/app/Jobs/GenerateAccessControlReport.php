<?php

namespace App\Jobs;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;

class GenerateAccessControlReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;


    public function __construct(
        public $chunk,
        public $companyId,
        public $date,
        public $params,
        public $company,
        public $batchKey,
        public $totalPages
    ) {}
    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $company_id = $this->companyId;

        $date = $this->date;

        $filesPath = public_path("access_control_reports/companies/$company_id/$date");

        if (!file_exists($filesPath)) {
            mkdir($filesPath, 0777, true);
        }

        $payload = [
            "chunk" => $this->chunk,
            "company" => $this->company,
            "params" => $this->params,
            "currentPage" => $this->batchKey,
            "totalPages" => $this->totalPages,
            "date" => $date
        ];

        $output = Pdf::loadView('pdf.access_control_reports.report', $payload)->output();

        $file_name = $this->batchKey . '.pdf';

        file_put_contents($filesPath . '/' . $file_name, $output);

        if ($payload["currentPage"] >= $payload["totalPages"]) {

            $this->MergeAllGenerateFiles($company_id, $date);

            $message = "\n Access control report has been generated. Company id = $company_id, date = $date";

            echo $message;

            info($message);
        }
    }

    public function MergeAllGenerateFiles($company_id, $date)
    {
        $filesPath = public_path("access_control_reports/companies/$company_id/$date");

        $pdfFiles = glob($filesPath . '/*.pdf');

        usort($pdfFiles, function ($a, $b) {
            // Extract the numeric part from the file names
            $numA = (int)pathinfo($a, PATHINFO_FILENAME);
            $numB = (int)pathinfo($b, PATHINFO_FILENAME);

            // Compare numerically
            return $numA <=> $numB;
        });

        // Initialize FPDI
        $pdf = new \setasign\Fpdi\Fpdi();

        // Loop through each PDF file
        foreach ($pdfFiles as $file) {
            $pageCount = $pdf->setSourceFile($file);

            // Add each page from the source PDF to the final output
            for ($i = 1; $i <= $pageCount; $i++) {
                $tplId = $pdf->importPage($i);
                $size = $pdf->getTemplateSize($tplId);  // Get the page size of the imported PDF

                // Adjust orientation based on the original page's width and height
                $orientation = ($size['width'] > $size['height']) ? 'L' : 'P';  // Auto-detect orientation

                // Add a new page with the detected orientation
                $pdf->AddPage($orientation, [$size['width'], $size['height']]);

                $pdf->useTemplate($tplId);
            }
        }

        $outputPath = public_path("access_control_reports/companies/$company_id/");

        $outputFilePath = $outputPath . "$date.pdf";

        $pdf->Output($outputFilePath, 'F');

        // Delete the directory and its contents
        if (File::exists($filesPath)) {
            File::deleteDirectory($filesPath);
        }
    }
}
