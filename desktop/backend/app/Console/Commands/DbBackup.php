<?php

namespace App\Console\Commands;

use App\Mail\DbBackupMail;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
// use Illuminate\Support\Facades\Log as Logger;
// use Illuminate\Support\Facades\Mail;
// use App\Mail\NotifyIfLogsDoesNotGenerate;


class DbBackup extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:db_backup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Database Backup';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        echo exec("php artisan backup:clean");
        echo exec("php artisan backup:run --only-db");

        echo "\n";

        $data = [
            'file' => collect(glob(storage_path("app/mytime2cloud/*.zip")))->last(),
            'date' => date('Y-M-d'),
            'body' => 'mytime2cloud Database Backup',
        ];

        Mail::to(env("ADMIN_MAIL_RECEIVERS"))->queue(new DbBackupMail($data));


        $this->sqlBackup();
    }

    public function sqlBackup()
    {
        // $filename = "backup-" . Carbon::now()->format('Y-m-d') . ".sql";
        // // Create backup folder and set permission if not exist.
        // $storageAt = storage_path() . "/app/backup/";
        // if (!File::exists($storageAt)) {
        //     File::makeDirectory($storageAt, 0755, true, true);
        // }
        // $command = "" . env('DB_DUMP_PATH', 'mysqldump') . " --user=" . env('DB_USERNAME') . " --password=" . env('DB_PASSWORD') . " --host=" . env('DB_HOST') . " " . env('DB_DATABASE') . "  | gzip > " . $storageAt . $filename;
        // $returnVar = NULL;
        // $output = NULL;
        // exec($command, $output, $returnVar);
    }
}
