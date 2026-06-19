<?php

namespace App\Console\Commands;

use App\Http\Controllers\AttendanceLogCameraController;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessCameraLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'camera2:process-logs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     *
     * @return int
     */
    // app/Console/Commands/ProcessCameraLogs.php

    public function handle()
    {
        $this->info('Camera log processor started...');

        while (true) {
            try {
                (new AttendanceLogCameraController)->store();
            } catch (\Throwable $th) {
                Log::channel('custom')->error('Camera flush error: ' . $th->getMessage());
            }

            sleep(30); // Sleep for 30 seconds before checking for new logs
        }
    }
}
