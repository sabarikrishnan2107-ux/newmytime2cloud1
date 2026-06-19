<?php

namespace App\Observers;

use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\RealTimeLocation;
use App\Services\Notify;
use Illuminate\Support\Facades\Log;

class AttendanceLogObserver
{
    public function created(AttendanceLog $log): void
    {
        $source = 'device';
        if ($log->channel === 'camera') {
            $source = 'camera';
        } elseif (str_contains($log->DeviceID ?? '', 'Mobile')) {
            $source = 'mobile';
        } elseif ($log->DeviceID === 'Manual') {
            $source = 'manual';
        }

        Log::info("AttendanceLogObserver: New log UserID={$log->UserID}, type={$log->log_type}, source={$source}");

        // Mirror mobile clock-ins into real_time_locations so the live tracker gets
        // a marker + SSE push automatically, without requiring the mobile app to
        // hit the /realtime_location endpoint separately.
        if ($source !== 'mobile') {
            return;
        }

        if (! is_numeric($log->lat) || ! is_numeric($log->lon)) {
            return;
        }

        try {
            $employee = Employee::where('company_id', $log->company_id)
                ->where('system_user_id', $log->UserID)
                ->first(['first_name', 'last_name', 'profile_picture']);

            $fullName = $employee
                ? trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''))
                : null;
            $avatar = $employee?->profile_picture;

            $loggedAt = $log->LogTime ?? now()->toDateTimeString();

            $row = RealTimeLocation::create([
                'company_id' => $log->company_id,
                'UserID'     => $log->UserID,
                'device_id'  => $log->DeviceID,
                'latitude'   => (string) $log->lat,
                'longitude'  => (string) $log->lon,
                'date'       => substr($loggedAt, 0, 10),
                'datetime'   => $loggedAt,
                'full_name'  => $fullName,
            ]);

            $payload = $row->toArray();
            $payload['avatar'] = $avatar;
            Notify::push($log->company_id, 'map', 'new location recorded', $payload);
        } catch (\Throwable $th) {
            Log::error('AttendanceLogObserver: real-time mirror failed', [
                'UserID'  => $log->UserID,
                'error'   => $th->getMessage(),
            ]);
        }
    }
}
