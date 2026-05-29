<?php

namespace App\Jobs;

use App\Http\Controllers\Shift\FiloShiftController;
use App\Http\Controllers\Shift\MultiInOutShiftController;
use App\Http\Controllers\Shift\NightShiftController;
use App\Http\Controllers\Shift\SingleShiftController;
use App\Http\Controllers\Shift\SplitShiftController;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\ScheduleEmployee;
use App\Models\Shift;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Request;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Console\Output\BufferedOutput;

class RecalculateEmployeeAttendance implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $employeeId;
    public int $companyId;
    public string $date;
    public string $source;

    public function __construct(int $employeeId, int $companyId, string $date, string $source = 'auto')
    {
        $this->employeeId = $employeeId;
        $this->companyId = $companyId;
        $this->date = $date;
        $this->source = $source;
    }

    public function handle(): void
    {
        $employee = Employee::find($this->employeeId);
        if (!$employee) {
            Log::warning("RecalculateAttendance: Employee {$this->employeeId} not found");
            return;
        }

        $userID = $employee->system_user_id;
        if (!$userID) {
            Log::warning("RecalculateAttendance: Employee {$this->employeeId} has no system_user_id");
            return;
        }

        // Find the employee's active shift
        $schedule = ScheduleEmployee::where('employee_id', $userID)
            ->whereHas('shift', function ($q) {
                $q->where(function ($q2) {
                    $q2->whereNull('from_date')->orWhere('from_date', '<=', $this->date);
                })->where(function ($q2) {
                    $q2->whereNull('to_date')->orWhere('to_date', '>=', $this->date);
                });
            })
            ->latest('updated_at')
            ->first();

        if (!$schedule || !$schedule->shift) {
            Log::info("RecalculateAttendance: No shift for employee {$this->employeeId} ({$userID}) on {$this->date}");
            return;
        }

        $shift = $schedule->shift;
        $shiftTypeId = $shift->shift_type_id;

        Log::info("RecalculateAttendance: Employee {$userID}, shift '{$shift->name}' (type {$shiftTypeId}), date {$this->date}, source: {$this->source}");

        try {
            $this->processShiftType($shiftTypeId, $userID, $shift);
            $this->updateLogTypes($userID, $shift);
        } catch (\Exception $e) {
            Log::error("RecalculateAttendance: Error for employee {$userID}: " . $e->getMessage());
        }
    }

    /**
     * After recalculation, mark the first log as "In" and the last qualifying log as "Out"
     * in attendance_logs so the dashboard Live Feed shows IN/OUT correctly.
     */
    private function updateLogTypes(string $userID, Shift $shift): void
    {
        $attendance = Attendance::where('employee_id', $userID)
            ->where('company_id', $this->companyId)
            ->whereDate('date', $this->date)
            ->first();

        if (!$attendance) {
            return;
        }

        // Reset all log_type for this employee on this date (skip rejected logs)
        AttendanceLog::where('UserID', $userID)
            ->where('company_id', $this->companyId)
            ->where('LogTime', '>=', $this->date)
            ->where('LogTime', '<', date('Y-m-d', strtotime($this->date . ' +2 days')))
            ->whereNull('rejected_reason')
            ->update(['log_type' => null]);

        // Mark the IN log
        if ($attendance->in) {
            $inLog = AttendanceLog::where('UserID', $userID)
                ->where('company_id', $this->companyId)
                ->where('LogTime', '>=', $this->date)
                ->where('LogTime', '<', date('Y-m-d', strtotime($this->date . ' +2 days')))
                ->whereNull('rejected_reason')
                ->orderBy('LogTime', 'asc')
                ->first();

            if ($inLog) {
                $inLog->update(['log_type' => 'In']);
            }
        }

        // Mark the OUT log
        if ($attendance->out) {
            $offDuty = $shift->off_duty_time;
            $outDate = $this->date;

            // Night shift: off_duty is next day
            if ($offDuty && $shift->on_duty_time && $offDuty < $shift->on_duty_time) {
                $outDate = date('Y-m-d', strtotime($this->date . ' +1 day'));
            }

            $outLog = AttendanceLog::where('UserID', $userID)
                ->where('company_id', $this->companyId)
                ->where('LogTime', '>=', $this->date)
                ->where('LogTime', '<', date('Y-m-d', strtotime($this->date . ' +2 days')))
                ->whereNull('rejected_reason')
                ->orderBy('LogTime', 'desc')
                ->first();

            if ($outLog && $outLog->id !== ($inLog->id ?? null)) {
                $outLog->update(['log_type' => 'Out']);
            }
        }
    }

    private function processShiftType(int $shiftTypeId, string $userID, Shift $shift): void
    {
        switch ($shiftTypeId) {
            case 1: // FILO
                (new FiloShiftController)->render(
                    $this->companyId,
                    $this->date,
                    $shiftTypeId,
                    [$userID],
                    true,
                    $this->source
                );
                break;

            case 2: // Multi Shift
                $outputBuffer = new BufferedOutput();
                Artisan::call('task:sync_multi_shift_dual_day', [
                    'company_id' => $this->companyId,
                    'date' => $this->date,
                    'checked' => true,
                    'UserID' => $userID,
                ], $outputBuffer);
                break;

            case 3: // Auto Shift
                $request = new Request([
                    'company_id' => $this->companyId,
                    'company_ids' => [$this->companyId],
                    'dates' => [$this->date, $this->date],
                    'employee_ids' => [$userID],
                    'shift_type_id' => $shiftTypeId,
                    'channel' => $this->source,
                ]);
                (new SingleShiftController)->renderData($request);
                break;

            case 4: // Night Shift
                $request = new Request([
                    'company_id' => $this->companyId,
                    'company_ids' => [$this->companyId],
                    'dates' => [$this->date, $this->date],
                    'employee_ids' => [$userID],
                    'shift_type_id' => $shiftTypeId,
                    'channel' => $this->source,
                ]);
                (new NightShiftController)->renderData($request);
                break;

            case 5: // Split Shift
                $request = new Request([
                    'company_id' => $this->companyId,
                    'company_ids' => [$this->companyId],
                    'dates' => [$this->date, $this->date],
                    'employee_ids' => [$userID],
                    'shift_type_id' => $shiftTypeId,
                    'channel' => $this->source,
                ]);
                (new SplitShiftController)->renderData($request);
                break;

            case 6: // Single Shift
                $request = new Request([
                    'company_id' => $this->companyId,
                    'company_ids' => [$this->companyId],
                    'dates' => [$this->date, $this->date],
                    'employee_ids' => [$userID],
                    'shift_type_id' => $shiftTypeId,
                    'channel' => $this->source,
                ]);
                (new SingleShiftController)->renderData($request);
                break;

            default:
                // Fallback: try SingleShift
                (new FiloShiftController)->render(
                    $this->companyId,
                    $this->date,
                    $shiftTypeId,
                    [$userID],
                    true,
                    $this->source
                );
                break;
        }
    }
}
