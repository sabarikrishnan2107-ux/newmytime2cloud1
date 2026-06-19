<?php

namespace App\Console\Commands;

use App\Http\Controllers\AlarmLogsController;

use Illuminate\Console\Command;

class SyncAlarmLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_alarm_logs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync alarm   Logs';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        echo (new AlarmLogsController)->store();
    }
}
