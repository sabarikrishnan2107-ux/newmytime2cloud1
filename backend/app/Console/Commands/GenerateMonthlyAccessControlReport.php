<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Carbon\Carbon;

class GenerateMonthlyAccessControlReport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pdf:access-control-report-generate-month {company_id} {year} {month}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate access control reports for an entire month';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $company_id = $this->argument('company_id');

        $year = $this->argument('year');
        $month = $this->argument('month');

        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate->copy()->endOfMonth();

        for ($date = $startDate; $date->lte($endDate); $date->addDay()) {
            $formattedDate = $date->format('Y-m-d');

            $this->call("pdf:access-control-report-generate", [
                'company_id' => $company_id,
                'date' => $formattedDate
            ]);
            
            $this->info("Generated report for $company_id $formattedDate");

            sleep(10);
        }

        return Command::SUCCESS;
    }
}
