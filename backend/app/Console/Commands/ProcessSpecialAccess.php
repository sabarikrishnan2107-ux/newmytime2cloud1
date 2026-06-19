<?php
namespace App\Console\Commands;

use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class ProcessSpecialAccess extends Command
{
    protected $signature   = 'employees:process-special-access';
    protected $description = 'Activate special access for employees whose start date matches today';

    public function handle()
    {
        $today = Carbon::today();

        // Get all employees with special access
        $employees = Employee::where('special_access', true)->get();

        foreach ($employees as $employee) {
            $startDate = Carbon::parse($employee->start_date);

            // If current date matches start date
            if ($startDate->isSameDay($today)) {
                $this->info("Processing employee ID: {$employee->id}");

                $expiryDateTime = Carbon::parse("{$employee->expiry_date} {$employee->expiry_time}");

                $url = env('SDK_URL') . "/" . $employee->device_id . "/AddPerson";

                $data = [
                    "userCode" => $employee->system_user_id,
                    "name"     => "{$employee->first_name} {$employee->last_name}",
                    "password" => $employee->rfid_card_password,
                    "expiry" => $expiryDateTime->format('Y-m-d H:i:s'),
                ];

                // Send request to device
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
        }

        $this->info('Special access processing completed.');
        return 0;
    }
}
