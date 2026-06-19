<?php

namespace App\Jobs;

use App\Http\Controllers\Controller;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;
use Webklex\PDFMerger\Facades\PDFMergerFacade as PDFMerger;
use Illuminate\Support\Facades\Storage;

class ReportsPDFMergeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;


    protected $foldername;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($foldername)
    {
        $this->foldername = $foldername;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $oMerger = PDFMerger::init();
        // $folderPath = public_path('app/public/temp_pdf/91522/'); // Replace 'your-folder' with the actual folder name or path
        $folderPath =  storage_path('/app/public/temp_pdf/' . $this->foldername . '/');
        if (File::isDirectory($folderPath)) {
            $files = File::files($folderPath);

            foreach ($files as $file) {
                $filename = pathinfo($file, PATHINFO_FILENAME);
                $extension = pathinfo($file, PATHINFO_EXTENSION);

                $oMerger->addPDF($file, 'all');
            }
        } else {
            echo "The specified folder does not exist.";
        }

        $oMerger->merge();
        $storage_path = storage_path("app/public/temp_pdf/" .  $this->foldername . ".pdf");


        $oMerger->save($storage_path);

        $file_name_raw = "jobs_pdf/jobs_pdf_" . date("d-m-Y") . ".txt";

        Storage::append($file_name_raw, $this->foldername  . ' - Merged Successfully');

        $storage_path = storage_path("app/public/temp_pdf/" .  $this->foldername . ".pdf");
        $path =  '\\public\\temp_pdf\\' . $this->foldername;
        if (Storage::exists($path)) {
            // Delete the folder and all its contents
            Storage::deleteDirectory($path);
        } else {

            //return "Folder does not exist.";
        }


        return  $storage_path;
    }
}
