<?php

namespace App\Console\Commands;

use App\Http\Controllers\Controller;
use App\Models\ScheduleEmployee;
use App\Models\ShiftType;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log as Logger;

class RenderNightShift extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'render:night_shift {company_id} {date}';

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
        $logFilePath = 'logs/shifts/night_shift/command';

        $id = $this->argument("company_id");

        $date = $this->argument("date");

        $employee_ids = ScheduleEmployee::whereIn("shift_type_id", [3, 4])->where("company_id", $id)->pluck("employee_id")->toArray();

        if (count($employee_ids) == 0) {
            (new Controller)->logOutPut($logFilePath, "*****Cron for task:night_shift: no employee found for $id*****");
            return;
        }

        $payload = [
            'date' => '',
            'UserID' => '',
            'updated_by' => "26",
            'company_ids' => [$id],
            'manual_entry' => true,
            'reason' => '',
            'employee_ids' => $employee_ids,
            'dates' => [$date, date("Y-m-d", strtotime($date . "+1 day"))],
            'shift_type_id' => 4
        ];

        $url = 'https://backend.mytime2cloud.com/api/render_logs';

        $response = Http::withoutVerifying()->get($url, $payload);

        if ($response->successful()) {
            $this->info("render:night_shift executed with " . $id);
        } else {
            $error_message = 'Cron: ' . env('APP_NAME') . ': Exception in render:night_shift  : Company Id :' . $id . ', : Date :' . $date . ', ' . $response->json();
            Logger::channel("custom")->error($error_message);
            $this->info("error");
        }
    }
}
