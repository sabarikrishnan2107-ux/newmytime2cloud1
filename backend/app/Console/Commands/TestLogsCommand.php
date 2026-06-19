<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TestLogsCommand extends Command
{
    // Usage: php artisan logs:generate {user_id=1000}
    protected $signature = 'logs:generate {user_id=1000}';

    protected $description = 'Generate today\'s check-in/out logs for a specific user';

    public function handle()
    {
        $userId = $this->argument('user_id');
        $today = Carbon::now()->toDateString();
        
        // Dynamic times with a bit of "random noise" for realism
        $checkInTime  = $today . ' 09:' . str_pad(rand(0, 15), 2, '0', STR_PAD_LEFT) . ':' . rand(10, 59);
        $checkOutTime = $today . ' 18:' . str_pad(rand(0, 15), 2, '0', STR_PAD_LEFT) . ':' . rand(10, 59);

        $data = [
            $this->buildLogRow($userId, $checkInTime, $today),  // Morning Log
            $this->buildLogRow($userId, $checkOutTime, $today), // Evening Log
        ];

        DB::table('attendance_logs')->insert($data);

        $this->info("Successfully inserted today's logs for User $userId.");
        $this->table(['Type', 'Timestamp'], [
            ['Check-In', $checkInTime],
            ['Check-Out', $checkOutTime]
        ]);
    }

    private function buildLogRow($userId, $fullDateTime, $dateOnly)
    {
        return [
            "UserID"              => $userId,
            "DeviceID"            => "DEV-" . rand(1, 5),
            "LogTime"             => $fullDateTime,
            "SerialNumber"        => rand(1000, 9999),
            "status"              => "Allowed",
            "mode"                => "Other",
            "reason"              => "Normal",
            "company_id"          => 2,
            "source_info"         => "Manual Test",
            "log_date_time"       => $fullDateTime,
            "index_serial_number" => rand(1000, 9999),
            "log_date"            => $dateOnly,
            "created_at"          => now(),
            "updated_at"          => now(),
        ];
    }
}