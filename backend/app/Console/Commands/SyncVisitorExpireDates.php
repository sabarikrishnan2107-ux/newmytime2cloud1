<?php

namespace App\Console\Commands;

use App\Http\Controllers\Visitor\VisitorAttendanceRenderController;
use App\Models\VisitorAttendance;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncVisitorExpireDates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_visitor_set_expire_dates {company_id}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync SyncVisitorExpireDates';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $id = $this->argument("company_id");



        try {

            echo (new VisitorAttendanceRenderController())->setVisitorExpireDates($id);

            echo  "\n";
        } catch (\Throwable $th) {
            //throw $th;
            $error_message = 'Cron: ' . env('APP_NAME') . ': Exception in task:SyncVisitorExpireDates  : Company Id :' . $id .    ', ' . $th;
            Log::channel("custom")->error($error_message);
            echo $error_message;
        }
    }
}
