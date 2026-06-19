<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\WhatsappNotificationsLog;
use Illuminate\Console\Command;


use Illuminate\Support\Facades\File;

class DeleteOldLogFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:files-delete-old-log-files';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete .log and .txt files older than 7 days from the specified path';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $path = storage_path() . "/app"; //"/mytime2cloud/backend/storage/app";
        $this->deleteAttendanceLogFiles($path);

        $path = storage_path() . "/kernal_logs"; //"/mytime2cloud/backend/storage/app";
        $this->deleteAttendanceLogFiles($path);

        $path = storage_path() . "/logs"; //"/mytime2cloud/backend/storage/app";
        $this->deleteAttendanceLogFiles($path);

        $path = storage_path() . "/dev_logs"; //"/mytime2cloud/backend/storage/app";
        $this->deleteAttendanceLogFiles($path);

        $path = storage_path() . "/camera"; //"/mytime2cloud/backend/storage/app";
        $this->deleteAttendanceLogFiles($path);

        $path = storage_path() . "/helper_logs"; //"/mytime2cloud/backend/storage/app";
        $this->deleteAttendanceLogFiles($path);


        $path = "/var/www/mytime2cloud/camera-xml-logs"; //"/mytime2cloud/backend/storage/app";
        $this->deleteAttendanceLogFiles($path);

        $path = "/var/www/mytime2cloud/backend/storage/logs"; //"/mytime2cloud/backend/storage/app";
        $this->deleteAttendanceLogFiles($path);





        $path = "/var/log"; //"/mytime2cloud/backend/storage/app";
        $this->deleteAttendanceLogFiles($path);






        // Delete Old logs from database 
        //delete whatsapp notification logs 
        $previousDate = date('Y-m-d', strtotime('-2 days'));
        WhatsappNotificationsLog::where("sent_status", true)->where("created_at", "<=", $previousDate . " 00:00:00")->delete();


        // $previousDate = date('Y-m-d', strtotime('-366 days'));
        // AttendanceLog::where("created_at", "<=", $previousDate . " 00:00:00")->delete();

        // $previousDate = date('Y-m-d', strtotime('-180 days'));
        // Attendance::where("date", "<=", $previousDate)->delete();
    }

    public function deleteAttendanceLogFiles($path)
    {
        //$path = storage_path() . "/app"; //"/mytime2cloud/backend/storage/app";

        if (!File::exists($path)) {
            echo "The specified path does not exist.";
            return 1;
        }

        //$files = File::files($path);
        $files = File::allFiles($path);

        echo $path . " - Files count - " . count($files);

        $now = time();
        $days30 = 2 * (24 * 60 * 60); //5Days days



        foreach ($files as $file) {
            $extension = $file->getExtension();
            if (in_array($extension, ['log', 'txt', 'csv', 'gz']) && ($now - $file->getMTime() >= $days30)) {
                File::delete($file);
                $this->info("Deleted: {$file->getFilename()}");
            }
        }

        $this->info('Old files deletion process completed.');
        return 0;
    }
    public function deleteSDKLogFiles($path)
    {
        $path = "/var/www/sdk-mytime2cloud"; //"/mytime2cloud/backend/storage/app";

        if (!File::exists($path)) {
            echo "The specified path does not exist.";
            return 1;
        }

        //$files = File::files($path);
        $files = File::allFiles($path);

        echo $path . " - Files count - " . count($files);

        $now = time();
        $days30 = 15 * (24 * 60 * 60); //30 DaysDays days

        $extArray = ['log', 'txt', 'csv', 'gz'];

        for ($i = 1; $i < 100; $i++) {
            $extArray[] = $i;
        }



        foreach ($files as $file) {

            if (str_contains($file->getFilename(), "RecordLog.txt")) {

                $extension = $file->getExtension();
                $inarray1 = in_array($extension, $extArray) ? 'TRUE' : 'FALSE';
                $time =  $now - $file->getMTime() >= $days30 ? 'TRUE' : 'FALSE';
                echo    $file->getFilename() . $inarray1 . '-' . $time  . "<br/>";
                if (in_array($extension, $extArray) && ($now - $file->getMTime() >= $days30)) {
                    File::delete($file);

                    echo  "Deleted: {$file->getFilename()}" . "<br/>";
                }
            }
        }

        return 0;
    }
}
