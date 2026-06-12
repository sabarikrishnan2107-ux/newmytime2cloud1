<?php

namespace App\Console\Commands;

use App\Http\Controllers\MonthlyFlexibleHolidaysController;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;
use Symfony\Component\Console\Input\InputOption;

class SyncMonthlyFlexibleHolidays extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    // protected $signature = 'task:sync_monthly_flexible_holidays {id} {date}';
    protected function configure()
    {
        $this->setName('task:sync_monthly_flexible_holidays')
            ->setDescription('Description of your command')
            ->addOption('company_id', null, InputOption::VALUE_OPTIONAL, 'Seperate Company Id')
            ->addOption('date', null, InputOption::VALUE_OPTIONAL, 'date to generate data');
    }

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Monthly Flexible Holidays';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $company_id = $this->option('company_id') ?? 8;
        $date       = $this->option('date') ?? date('Y-m-d');

        // echo $date;
        // die;

        try {
            echo (new MonthlyFlexibleHolidaysController)->renderMonthlyFlexibleHolidaysCron($company_id, $date);
        } catch (\Throwable $th) {
            Logger::channel("custom")->error('Cron: SyncAbsent. Error Details: ' . $th);
            echo "[" . date("Y-m-d H:i:s") . "] Cron: SyncAbsent. Error occurred while inserting logs.\n";
        }
    }
}
