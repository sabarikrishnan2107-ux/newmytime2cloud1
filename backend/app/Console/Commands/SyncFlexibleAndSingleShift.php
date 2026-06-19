<?php

namespace App\Console\Commands;

use App\Http\Controllers\Shift\FlexibleAndSingleController;
use Illuminate\Console\Command;

class SyncFlexibleAndSingleShift extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_flexible_and_single_shift {id} {date}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync All Shift';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        echo (new FlexibleAndSingleController)->render($this->argument("id"), $this->argument("date")) . "\n";
    }
}
