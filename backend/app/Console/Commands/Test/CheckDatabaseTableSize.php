<?php

namespace App\Console\Commands\Test;

use App\Helpers\BenchmarkHelper;
use App\Http\Controllers\Controller;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckDatabaseTableSize extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:row-count';

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
        $tables = DB::connection()->getDoctrineSchemaManager()->listTableNames();

        foreach ($tables as $table) {
            $benchmark = BenchmarkHelper::measure(fn() => DB::table($table)->count());
            if ($benchmark['result'] > 100000) {
                $this->info("-------------------------------------");
                $this->info("Table: $table, Row Count: {$benchmark['result']}");
                $this->info("Execution Time: {$benchmark['execution_time']} sec");
                $this->info("Memory Used: {$benchmark['memory_used']}");
                $this->info("-------------------------------------");
            }
        }
    }
}
