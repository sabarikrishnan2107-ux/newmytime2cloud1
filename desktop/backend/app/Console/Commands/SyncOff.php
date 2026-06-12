<?php
namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\ScheduleEmployee;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log as Logger;

class SyncOff extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'task:sync_off {id} {ask?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Off';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $ask     = $this->argument('ask');
        $daysAgo = 1;

        if ($ask) {
            $daysAgo = $this->ask("daysAgo", $daysAgo);
        }

        $daysAgo -= 1;

        try {
            $company_id = $this->argument('id');

            // ✅ Define the date range
            $from = date('Y-m-d', strtotime("-{$daysAgo} day"));
            $to   = date('Y-m-d'); // You can change this to any end date

            // ✅ Generate all dates between from → to
            $period = new \DatePeriod(
                new \DateTime($from),
                new \DateInterval('P1D'),
                (new \DateTime($to))->modify('+1 day')
            );

            // ✅ Get all schedules with their shifts (so we can check off days)
            $schedules = ScheduleEmployee::with(['shift'])
                ->where("company_id", $company_id)
                ->whereHas('shift', fn($query) => $query->where("from_date", "<=", $from))
                ->whereHas('shift', fn($query) => $query->where("to_date", ">=", $to))
                ->get();

            foreach ($schedules as $schedule) {
                $employeeId = $schedule->employee_id;
                $shiftDays  = $schedule->shift->days; // e.g. ["Mon","Tue","Wed","Thu","Fri"]

                if (empty($shiftDays)) {
                    continue;
                }

                foreach ($period as $dateObj) {
                    $currentDate = $dateObj->format('Y-m-d');
                    $dayName     = $dateObj->format('D'); // Sun, Mon, Tue, etc.

                    // ✅ Check if it's an off day
                    $isOffDay = ! in_array($dayName, $shiftDays);

                    if (! $isOffDay) {
                        continue; // skip working days
                    }

                    // ✅ Update attendance only if it exists and is not already 'O'
                    $updated = Attendance::where('employee_id', $employeeId)
                        ->where('company_id', $company_id)
                        ->whereDate('date', $currentDate)
                        ->where('status', 'A')
                        ->update(['status' => 'O']);

                    if ($updated) {
                        echo "✔ Marked OFF (O) for employee {$employeeId} on {$dayName} ({$currentDate})\n";
                    }
                }
            }

            echo "✅ Completed marking 'O' for off days.\n";

        } catch (\Throwable $th) {
            info('Cron: SyncOff. Error Details: ' . $th);
        }
    }
}
