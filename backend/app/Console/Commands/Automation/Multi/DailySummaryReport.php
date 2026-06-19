<?php

namespace App\Console\Commands\Automation\Multi;

use App\Http\Controllers\Reports\MonthlyController;
use App\Models\Company;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class DailySummaryReport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'multi:daily_summary_report';

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
        $apiUrl = env('BASE_URL') . '/api/multi_in_out_monthly_generate';

        $params = [
            'report_template' => 'Template2',
            'main_shift_type' => 2,
            'branch_id' => 38,
            'shift_type_id' => 2,
            'company_id' => 22,
            'status' => -1,
            'department_ids' => 159,
            'employee_id' => '718,94,622,685,608',
            'report_type' => 'Monthly',
            'from_date' => '2024-08-16',
            'to_date' => '2024-08-16',
        ];

        $response = Http::timeout(300)->withoutVerifying()->get($apiUrl, $params);

        if ($response->successful()) {
            $data = $response->body(); // or $response->body() for the raw response
            echo json_encode($data);
        } else {
            $error = $response->status();
            echo json_encode($error);
        }
    }
}
