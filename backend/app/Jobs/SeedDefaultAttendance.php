<?php
namespace App\Jobs;

use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SeedDefaultAttendance implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $company_id, $branchId, $employee_id, $shift_id, $shift_type_id;

    public function __construct($company_id, $branchId, $employee_id, $shift_id, $shift_type_id)
    {
        $this->company_id = $company_id;
        $this->branchId = $branchId;
        $this->employee_id = $employee_id;
        $this->shift_id = $shift_id;
        $this->shift_type_id = $shift_type_id;
    }

    public function handle()
    {
        $daysInMonth = Carbon::now()->daysInMonth;
        $data = [];

        foreach (range(1, $daysInMonth) as $day) {
            $data[] = [
                "date" => Carbon::now()->format("Y-m") . '-' . sprintf("%02d", $day),
                "employee_id" => $this->employee_id,
                "shift_id" => $this->shift_id,
                "shift_type_id" => $this->shift_type_id,
                "status" => "A",
                "in" => "---",
                "out" => "---",
                "total_hrs" => "---",
                "ot" => "---",
                "late_coming" => "---",
                "early_going" => "---",
                "device_id_in" => "---",
                "device_id_out" => "---",
                "company_id" => $this->company_id,
                "branch_id" => $this->branchId,
                "created_at" => now(),
                "updated_at" => now(),
                "updated_func" => "seedDefaultData"
            ];
        }

        Attendance::where("company_id", $this->company_id)
            ->where("employee_id", $this->employee_id)
            ->whereMonth("date", now()->month)
            ->delete();

        Attendance::insert($data);
    }
}
