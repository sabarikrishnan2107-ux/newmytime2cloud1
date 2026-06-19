<?php
namespace App\Console\Commands;

use App\Models\AttendanceLog;
use Illuminate\Console\Command;

class UpdateLogDateColumn extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */

    protected $signature = 'update_log_date_column {company_id} {from_date} {to_date}';

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
        $id        = $this->argument("company_id", 1);
        $from_date = $this->argument("from_date", date("Y-m-d"));
        $to_date   = $this->argument("to_date", date("Y-m-d"));

        $rows = AttendanceLog::where("company_id", $id ?? 1)
            ->where("LogTime", ">=", $from_date) // Check for logs on or after the current date
            ->where("LogTime", "<=", $to_date)
            ->get(["id", "LogTime", "log_date"])->toArray();

        $this->info(count($rows));

        foreach ($rows as $key => $value) {
            $result = AttendanceLog::where("id", $value["id"])
                ->update([
                    "log_date" => date("Y-m-d", strtotime($value["LogTime"])),
                ]);
        }
    }
}
