<?php

namespace App\Console\Commands;

use App\Http\Controllers\Visitor\VisitorAttendanceRenderController;
use App\Models\VisitorAttendance;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncVisitorAttendance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_visitor_attendance {company_id} {date}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync SyncVisitorAttendance';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $id = $this->argument("company_id");
        $date = $this->argument("date");
        $shift_type_id = 1;


        try {
            echo (new VisitorAttendanceRenderController())->render($id, $date, $shift_type_id, [], false) . "\n";
        } catch (\Throwable $th) {
            //throw $th;
            $error_message = 'Cron: ' . env('APP_NAME') . ': Exception in task:SyncVisitorAttendance  : Company Id :' . $id . ', : Date :' . $date . ', ' . $th;
            Log::channel("custom")->error($error_message);
            echo $error_message;
        }
    }
}
