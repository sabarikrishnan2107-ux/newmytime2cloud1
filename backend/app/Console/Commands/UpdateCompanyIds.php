<?php

namespace App\Console\Commands;

use App\Helpers\BenchmarkHelper;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Device;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;
use Illuminate\Support\Facades\Mail;
use App\Mail\NotifyIfLogsDoesNotGenerate;
use Illuminate\Support\Facades\DB;

class UpdateCompanyIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:update_company_ids';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update Company Ids';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $logger = new Controller;

        $logFilePath = 'logs/common_logs';

        $logFilePath = "$logFilePath/";

        $logger->logOutPut($logFilePath, "*****Cron started for task:update_company_ids  *****");

        try {
            $benchmark = BenchmarkHelper::measure(function () {
                return json_encode((new CompanyController)->updateCompanyIds());
            });

            $logger->logOutPut($logFilePath, "✔ Execution Successful");
            $logger->logOutPut($logFilePath, "▶ Result: {$benchmark['result']}");
            $logger->logOutPut($logFilePath, "⏳ Execution Time: {$benchmark['execution_time']} sec");
            $logger->logOutPut($logFilePath, "💾 Memory Used: {$benchmark['memory_used']}");

            $this->info("✔ Execution Successful");
            $this->info("▶ Result: {$benchmark['result']}");
            $this->info("⏳ Execution Time: {$benchmark['execution_time']} sec");
            $this->info("💾 Memory Used: {$benchmark['memory_used']}");
        } catch (\Exception $e) {
            $logger->logOutPut($logFilePath, "❌ Error: " . $e->getMessage());
        }

        $logger->logOutPut($logFilePath, "*****Cron Ended for task:update_company_ids  *****");
    }
}
