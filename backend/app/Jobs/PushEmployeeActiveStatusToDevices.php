<?php

namespace App\Jobs;

use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PushEmployeeActiveStatusToDevices implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(public int $employeeId, public bool $isActive) {}

    public function handle(): void
    {
        $employee = Employee::find($this->employeeId);
        if (!$employee) {
            return;
        }

        // Device push is best-effort. The backend gate in AttendanceLogController is the
        // source of truth — even if every device push fails, non-active employees still
        // cannot record attendance because their logs are tagged rejected_reason and
        // skipped by the auto-regenerate / recalculate pipeline.
        Log::info('Employee active status transition', [
            'employee_id'    => $employee->id,
            'system_user_id' => $employee->system_user_id,
            'is_active'      => $this->isActive,
        ]);

        // Hook point: when per-device remote enable/disable becomes available, wire it
        // here. Loop over the employee's enrolled devices and call the appropriate SDK
        // method. Failures should be caught individually so one bad device doesn't
        // block the rest.
    }
}
