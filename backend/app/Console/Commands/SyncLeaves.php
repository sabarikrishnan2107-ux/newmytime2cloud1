<?php

namespace App\Console\Commands;

use App\Http\Controllers\Shift\RenderController;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;

class SyncLeaves extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_leaves {id}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Leaves';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $id = $this->argument('id');

        try {
            echo (new RenderController)->renderLeavesCron($id);
        } catch (\Throwable $th) {
            Logger::channel("custom")->error('Cron: SyncLeaves. Error Details: ' . $th);
            echo "[" . date("Y-m-d H:i:s") . "] Cron: SyncLeaves. Error occurred while inserting logs.\n";
        }
    }
}