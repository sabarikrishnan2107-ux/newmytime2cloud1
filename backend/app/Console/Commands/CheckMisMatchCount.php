<?php

namespace App\Console\Commands;

use App\Http\Controllers\AttendanceLogController;
use Illuminate\Console\Command;

class CheckMisMatchCount extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:render_missing';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'CheckMisMatchCount';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        echo (new AttendanceLogController)->renderMissing();
    }
}
