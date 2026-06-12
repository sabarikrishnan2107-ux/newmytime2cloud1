<?php
namespace App\Console\Commands;

use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class ProcessManualAttendanceLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * You can run it using:
     * php artisan attendance:manual-check
     */
    protected $signature = 'attendance:manual-check';

    /**
     * The console command description.
     */
    protected $description = 'Process employees who have attendance logs with mode=Manual for the current date';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = Carbon::today()->toDateString();

        // Fetch employees having attendance logs with today's date and mode = 'Manual'
        $employees = Employee::where('special_access', true)
            ->where("is_multi_entry_allowed", false)
            ->whereHas('attendance_logs', function ($query){
                $query->whereDate("LogTime", date('Y-m-d'))
                    ->where('mode', 'Manual');
            })
            ->get(["id", "first_name", "last_name", "system_user_id", "rfid_card_password","device_id"]);

        if ($employees->isEmpty()) {
            $this->info("No employees found with manual attendance logs for {$today}.");
            return 0;
        }

        $this->info("Found {$employees->count()} employee(s) with manual attendance logs for {$today}.");

        // Example: process or display
        foreach ($employees as $employee) {
            $this->line("Employee ID: {$employee->id}, Name: {$employee->name}");

            $url = env('SDK_URL') . "/" . $employee->device_id . "/AddPerson";

            $data = [
                "userCode" => $employee->system_user_id,
                "name"     => "{$employee->first_name} {$employee->last_name}",
                "password" => $employee->rfid_card_password,
                "expiry" => "2001-01-01 00:00:00",
            ];

            try {
                $response = Http::timeout(10)->post($url, $data);

                if ($response->successful()) {
                    $this->info("✅ Successfully sent access for {$employee->first_name} {$employee->last_name}");
                } else {
                    $this->error("❌ Failed for {$employee->first_name} {$employee->last_name}: " . $response->body());
                }
            } catch (\Exception $e) {
                $this->error("⚠️ Error for {$employee->first_name} {$employee->last_name}: " . $e->getMessage());
            }
        }

        return 0;
    }
}
