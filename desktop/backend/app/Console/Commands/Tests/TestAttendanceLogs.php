<?php

namespace App\Console\Commands\Tests; // Updated namespace

use Illuminate\Console\Command;
use App\Jobs\StoreAttendanceLogsJobWithLocation;

class TestAttendanceLogs extends Command
{
    protected $signature = 'test:attendance-logs-with-location {lat=25.2048} {lon=55.2708}';
    protected $description = 'Test attendance logs insertion and reverse geocoding job';

    public function handle()
    {
        $lat = $this->argument('lat');
        $lon = $this->argument('lon');

        $now = now();

        $logs = [[
            'company_id'         => 0,
            'UserID'             => 88888888,
            'DeviceID'           => 'T8XY4T2L1QXG',
            'LogTime'            => $now->format('Y-m-d H:i:s'),
            'SerialNumber'       => 0,
            'status'             => 'Allowed',
            'mode'               => 'Face',
            'reason'             => '---',
            'log_date_time'      => $now->format('Y-m-d H:i:s'),
            'index_serial_number'=> null,
            'log_date'           => $now->format('Y-m-d'),
            'lat'                => $lat,
            'lon'                => $lon,
        ]];

        // Dispatch the Job
        StoreAttendanceLogsJobWithLocation::dispatch($logs);

        $this->info("✅ Test attendance log dispatched successfully!");
        $this->info("Lat: $lat, Lon: $lon");
    }
}
