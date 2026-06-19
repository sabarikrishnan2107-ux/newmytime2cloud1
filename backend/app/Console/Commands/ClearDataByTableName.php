<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ClearDataByTableName extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'clear-data';

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
    public function handle()
    {
        try {
            $table = $this->ask("Enter table name");
            DB::table($table)->truncate();
            $this->info("Data has been cleaned from ($table) table");
        } catch (\Exception $e) {
            $this->info($e->getMessage());
        }
    }
}
