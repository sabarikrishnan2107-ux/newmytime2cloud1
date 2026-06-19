<?php

namespace App\Http\Controllers;

use App\Models\AdvanceDeduction;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\EmployeeAdvance;
use App\Models\EmployeeLeaves;
use App\Models\EmployeeLoan;
use App\Models\LoanDeduction;
use App\Models\PayrollAdjustment;
use App\Models\PayrollBatch;
use App\Models\PayrollRecord;
use App\Models\PayrollConfig;
use App\Models\SalaryStructure;
use App\Models\ScheduleEmployee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollManagementController extends Controller
{
    // ── Employee List for Dropdowns ──
    public function employeeList(Request $request)
    {
        return Employee::where('company_id', $request->company_id)
            ->when($request->branch_id, fn($q) => $q->where('branch_id', $request->branch_id))
            ->select('id', 'first_name', 'last_name', 'employee_id', 'department_id', 'branch_id')
            ->with('department:id,name')
            ->with('branch:id,branch_name')
            ->orderBy('first_name')
            ->get();
    }

    // ── Single Employee Salary Structure (for Employee Edit page) ──
    public function employeeSalaryStructure(Request $request, $employeeId)
    {
        $structure = SalaryStructure::where('company_id', $request->company_id)
            ->where('employee_id', $employeeId)
            ->where('status', 'active')
            ->first();

        return response()->json($structure);
    }

    public function upsertEmployeeSalaryStructure(Request $request, $employeeId)
    {
        $data = $request->only([
            'basic_salary', 'house_allowance', 'transport_allowance',
            'food_allowance', 'medical_allowance', 'other_allowance',
            'overtime_eligible', 'loan_deduction', 'advance_deduction',
            'salary_mode', 'effective_from', 'effective_to',
        ]);
        $data['company_id'] = $request->company_id;
        $data['employee_id'] = $employeeId;
        $data['branch_id'] = $request->branch_id ?? Employee::find($employeeId)?->branch_id;
        $data['status'] = 'active';

        $totalAllowances = ($data['house_allowance'] ?? 0) + ($data['transport_allowance'] ?? 0) +
            ($data['food_allowance'] ?? 0) + ($data['medical_allowance'] ?? 0) + ($data['other_allowance'] ?? 0);

        $mode = $data['salary_mode'] ?? 'basic_based';
        if ($mode === 'gross_based') {
            // User entered gross as basic_salary field, calculate actual basic
            $data['gross_salary'] = $data['basic_salary'] ?? 0;
            $data['basic_salary'] = max(0, ($data['basic_salary'] ?? 0) - $totalAllowances);
        } elseif ($mode === 'net_based') {
            // User entered net as basic_salary field, store as-is for now
            $data['gross_salary'] = ($data['basic_salary'] ?? 0) + $totalAllowances;
        } else {
            // basic_based: user entered basic, calculate gross
            $data['gross_salary'] = ($data['basic_salary'] ?? 0) + $totalAllowances;
        }

        $structure = SalaryStructure::updateOrCreate(
            ['company_id' => $request->company_id, 'employee_id' => $employeeId],
            $data
        );

        return response()->json(['status' => true, 'data' => $structure]);
    }

    // ── Salary Structures ──
    public function salaryStructures(Request $request)
    {
        return SalaryStructure::where('company_id', $request->company_id)
            ->with('employee:id,first_name,last_name,employee_id,branch_id,department_id')
            ->with('employee.department:id,name')
            ->with('employee.branch:id,branch_name')
            ->when($request->branch_id, fn($q) => $q->where('branch_id', $request->branch_id))
            ->orderBy('id', 'desc')
            ->paginate($request->per_page ?? 20);
    }

    public function storeSalaryStructure(Request $request)
    {
        $request->validate([
            'company_id' => 'required',
            'employee_id' => 'required',
            'basic_salary' => 'required|numeric',
        ]);

        $data = $request->only([
            'company_id', 'employee_id', 'basic_salary', 'house_allowance',
            'transport_allowance', 'food_allowance', 'medical_allowance', 'other_allowance',
            'overtime_eligible', 'loan_deduction', 'advance_deduction',
            'salary_mode', 'effective_from', 'effective_to', 'status',
        ]);
        $data['branch_id'] = $request->branch_id ?? Employee::find($data['employee_id'])?->branch_id;

        $totalAllowances = ($data['house_allowance'] ?? 0) + ($data['transport_allowance'] ?? 0) +
            ($data['food_allowance'] ?? 0) + ($data['medical_allowance'] ?? 0) + ($data['other_allowance'] ?? 0);

        $mode = $data['salary_mode'] ?? 'basic_based';
        if ($mode === 'gross_based') {
            $data['gross_salary'] = $data['basic_salary'] ?? 0;
            $data['basic_salary'] = max(0, ($data['basic_salary'] ?? 0) - $totalAllowances);
        } else {
            $data['gross_salary'] = ($data['basic_salary'] ?? 0) + $totalAllowances;
        }

        $structure = SalaryStructure::create($data);
        return response()->json(['status' => true, 'data' => $structure]);
    }

    public function updateSalaryStructure(Request $request, $id)
    {
        $structure = SalaryStructure::where('company_id', $request->company_id)->findOrFail($id);
        $data = $request->only([
            'employee_id', 'basic_salary', 'house_allowance', 'transport_allowance',
            'food_allowance', 'medical_allowance', 'other_allowance',
            'overtime_eligible', 'loan_deduction', 'advance_deduction',
            'salary_mode', 'effective_from', 'effective_to', 'status',
        ]);
        $totalAllowances = ($data['house_allowance'] ?? $structure->house_allowance) +
            ($data['transport_allowance'] ?? $structure->transport_allowance) +
            ($data['food_allowance'] ?? $structure->food_allowance) +
            ($data['medical_allowance'] ?? $structure->medical_allowance) +
            ($data['other_allowance'] ?? $structure->other_allowance);

        $mode = $data['salary_mode'] ?? $structure->salary_mode ?? 'basic_based';
        if ($mode === 'gross_based') {
            $data['gross_salary'] = $data['basic_salary'] ?? $structure->basic_salary;
            $data['basic_salary'] = max(0, ($data['basic_salary'] ?? $structure->basic_salary) - $totalAllowances);
        } else {
            $data['gross_salary'] = ($data['basic_salary'] ?? $structure->basic_salary) + $totalAllowances;
        }
        $structure->update($data);
        return response()->json(['status' => true, 'data' => $structure]);
    }

    public function deleteSalaryStructure(Request $request, $id)
    {
        SalaryStructure::where('company_id', $request->company_id)->findOrFail($id)->delete();
        return response()->json(['status' => true, 'message' => 'Deleted']);
    }

    // ── Adjustments ──
    public function adjustments(Request $request)
    {
        $page = PayrollAdjustment::where('company_id', $request->company_id)
            ->with('employee:id,first_name,last_name,employee_id,department_id')
            ->with('employee.department:id,name')
            ->when($request->payroll_month, fn($q) => $q->where('payroll_month', $request->payroll_month))
            ->orderBy('id', 'desc')
            ->paginate($request->per_page ?? 20);

        $page->getCollection()->transform(function ($row) {
            $row->attachment_url = $row->attachment
                ? \Storage::disk('public')->url($row->attachment)
                : null;
            return $row;
        });

        return $page;
    }

    public function storeAdjustment(Request $request)
    {
        $request->validate([
            'company_id'    => 'required',
            'employee_id'   => 'required',
            'type'          => 'required|string',
            'amount'        => 'required|numeric|min:0',
            'payroll_month' => 'required|string',
            'remarks'       => 'nullable|string|max:1000',
            'attachment'    => 'nullable|file|max:5120', // 5 MB
        ]);

        $data = $request->only([
            'company_id', 'employee_id', 'type', 'amount', 'payroll_month', 'remarks',
        ]);
        $data['branch_id'] = $request->branch_id ?? Employee::find($data['employee_id'])?->branch_id;

        $storedPath = null;
        if ($request->hasFile('attachment')) {
            $storedPath = $request->file('attachment')->store('payroll/adjustments', 'public');
            $data['attachment'] = $storedPath;
        }

        try {
            $adj = PayrollAdjustment::create($data);
        } catch (\Throwable $e) {
            if ($storedPath) {
                \Storage::disk('public')->delete($storedPath);
            }
            throw $e;
        }

        $adj->attachment_url = $adj->attachment
            ? \Storage::disk('public')->url($adj->attachment)
            : null;

        return response()->json(['status' => true, 'data' => $adj]);
    }

    public function deleteAdjustment(Request $request, $id)
    {
        $adj = PayrollAdjustment::where('company_id', $request->company_id)->findOrFail($id);

        if ($adj->attachment) {
            try {
                \Storage::disk('public')->delete($adj->attachment);
            } catch (\Throwable $e) {
                \Log::warning('PayrollAdjustment file delete failed', [
                    'id'         => $adj->id,
                    'attachment' => $adj->attachment,
                    'error'      => $e->getMessage(),
                ]);
            }
        }

        $adj->delete();
        return response()->json(['status' => true, 'message' => 'Deleted']);
    }

    // ── Loans ──
    public function loans(Request $request)
    {
        return EmployeeLoan::where('company_id', $request->company_id)
            ->with('employee:id,first_name,last_name,employee_id,department_id')
            ->with('employee.department:id,name')
            ->orderBy('id', 'desc')
            ->paginate($request->per_page ?? 20);
    }

    public function storeLoan(Request $request)
    {
        $data = $request->only([
            'company_id', 'employee_id', 'loan_amount', 'monthly_installment',
            'start_month', 'end_month', 'remarks', 'status',
        ]);
        $data['outstanding_balance'] = $data['loan_amount'] ?? 0;
        $data['branch_id'] = $request->branch_id ?? Employee::find($data['employee_id'])?->branch_id;
        $loan = EmployeeLoan::create($data);
        return response()->json(['status' => true, 'data' => $loan]);
    }

    public function updateLoan(Request $request, $id)
    {
        $loan = EmployeeLoan::where('company_id', $request->company_id)->findOrFail($id);
        $data = $request->only([
            'employee_id', 'loan_amount', 'monthly_installment',
            'start_month', 'end_month', 'remarks', 'status',
        ]);
        $loan->update($data);
        return response()->json(['status' => true, 'data' => $loan]);
    }

    public function deleteLoan(Request $request, $id)
    {
        $loan = EmployeeLoan::where('company_id', $request->company_id)->findOrFail($id);
        \App\Models\LoanDeduction::where('loan_id', $loan->id)->delete();
        $loan->delete();
        return response()->json(['status' => true, 'message' => 'Loan deleted']);
    }

    // ── Advances ──
    public function advances(Request $request)
    {
        return EmployeeAdvance::where('company_id', $request->company_id)
            ->with('employee:id,first_name,last_name,employee_id,department_id')
            ->with('employee.department:id,name')
            ->orderBy('id', 'desc')
            ->paginate($request->per_page ?? 20);
    }

    public function storeAdvance(Request $request)
    {
        $data = $request->only([
            'company_id', 'employee_id', 'advance_amount', 'monthly_recovery',
            'issue_date', 'remarks', 'status',
        ]);
        $data['outstanding_balance'] = $data['advance_amount'] ?? 0;
        $data['branch_id'] = $request->branch_id ?? Employee::find($data['employee_id'])?->branch_id;
        $advance = EmployeeAdvance::create($data);
        return response()->json(['status' => true, 'data' => $advance]);
    }

    public function updateAdvance(Request $request, $id)
    {
        $advance = EmployeeAdvance::where('company_id', $request->company_id)->findOrFail($id);
        $data = $request->only([
            'employee_id', 'advance_amount', 'monthly_recovery',
            'issue_date', 'remarks', 'status',
        ]);
        $advance->update($data);
        return response()->json(['status' => true, 'data' => $advance]);
    }

    public function deleteAdvance(Request $request, $id)
    {
        $advance = EmployeeAdvance::where('company_id', $request->company_id)->findOrFail($id);
        \App\Models\AdvanceDeduction::where('advance_id', $advance->id)->delete();
        $advance->delete();
        return response()->json(['status' => true, 'message' => 'Advance deleted']);
    }

    // ── Batches ──
    public function batches(Request $request)
    {
        return PayrollBatch::where('company_id', $request->company_id)
            ->orderBy('id', 'desc')
            ->paginate($request->per_page ?? 10);
    }

    // ── Payroll Records ──
    public function records(Request $request, $batchId)
    {
        // Verify batch belongs to this company
        PayrollBatch::where('company_id', $request->company_id)->findOrFail($batchId);

        return PayrollRecord::where('batch_id', $batchId)
            ->with('employee:id,first_name,last_name,employee_id,branch_id,department_id,profile_picture')
            ->with('employee.branch:id,branch_name')
            ->with('employee.department:id,name')
            ->paginate($request->per_page ?? 50);
    }

    // ── Dashboard Stats ──
    public function dashboardStats(Request $request)
    {
        $companyId = $request->company_id;
        $month = $request->month ?? date('Y-m');

        $batch = PayrollBatch::where('company_id', $companyId)->where('month', $month)->latest('id')->first();
        $records = $batch ? PayrollRecord::where('batch_id', $batch->id)->get() : collect();

        $empCount = Employee::where('company_id', $companyId)->count();
        $structures = SalaryStructure::where('company_id', $companyId)->where('status', 'active')->count();

        // Monthly trend (last 6 batches)
        $recentBatches = PayrollBatch::where('company_id', $companyId)
            ->orderBy('month', 'desc')->limit(6)->get()->reverse()->values();
        $monthlyTrend = $recentBatches->map(fn($b) => [
            'month' => Carbon::parse($b->month . '-01')->format('M'),
            'gross' => round($b->total_gross, 0),
            'net' => round($b->total_net, 0),
            'deductions' => round($b->total_deductions, 0),
        ]);

        // Department cost from current batch records
        $deptCost = [];
        if ($records->isNotEmpty()) {
            $empIds = $records->pluck('employee_id')->unique();
            $employees = Employee::whereIn('id', $empIds)->with('department:id,name')->get()->keyBy('id');
            foreach ($records as $r) {
                $dept = $employees[$r->employee_id]?->department?->name ?? 'Other';
                $deptCost[$dept] = ($deptCost[$dept] ?? 0) + $r->net_salary;
            }
        }
        $departmentCost = collect($deptCost)->map(fn($cost, $dept) => ['department' => $dept, 'cost' => round($cost, 0)])->values();

        return response()->json([
            'total_employees' => $empCount,
            'salary_structures' => $structures,
            'total_gross' => $records->sum('gross_earned'),
            'total_deductions' => $records->sum('total_deduction'),
            'total_net' => $records->sum('net_salary'),
            'total_ot' => $records->sum('ot_amount'),
            'pending' => $records->where('status', 'draft')->count(),
            'approved' => $records->where('status', 'approved')->count(),
            'paid' => $records->where('status', 'paid')->count(),
            'batch' => $batch,
            'monthly_trend' => $monthlyTrend,
            'department_cost' => $departmentCost,
        ]);
    }

    // ── Generate Payroll ──
    public function generatePayroll(Request $request)
    {
        $companyId = $request->company_id;
        $month = $request->month ?? date('Y-m');
        $branchId = $request->branch_id;

        // Load company payroll settings
        $config = PayrollConfig::where('company_id', $companyId)->first();
        $daysMode = $config->days_mode ?? 'fixed_30';
        $workingHrsPerDay = $config->working_hours_per_day ?? 8;
        $normalOtMultiplier = $config->normal_ot_multiplier ?? 1.25;
        $weekendOtMultiplier = $config->weekend_ot_multiplier ?? 1.50;
        $holidayOtMultiplier = $config->holiday_ot_multiplier ?? 2.00;
        $lateDeductionMode = $config->late_deduction_mode ?? 'slab_based';
        $lateSlabs = $config->late_slabs ?? [];
        $roundingRule = $config->rounding_rule ?? 'none';

        // Find existing draft batch to reuse, or create new one
        $existing = PayrollBatch::where('company_id', $companyId)->where('month', $month)
            ->where('status', 'draft')
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->first();

        DB::beginTransaction();
        try {
            $structures = SalaryStructure::where('company_id', $companyId)
                ->where('status', 'active')
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->get();

            if ($structures->isEmpty()) {
                return response()->json(['status' => false, 'message' => 'No salary structures found'], 400);
            }

            $batch = $existing ?? PayrollBatch::create([
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'month' => $month,
                'status' => 'draft',
            ]);

            PayrollRecord::where('batch_id', $batch->id)->delete();

            $totalGross = 0;
            $totalDed = 0;
            $totalNet = 0;

            $monthStart = $month . '-01';
            $monthEnd = Carbon::parse($monthStart)->endOfMonth()->format('Y-m-d');
            $totalDaysInMonth = Carbon::parse($monthStart)->daysInMonth;

            // Days divisor based on settings
            $daysDivisor = $daysMode === 'fixed_30' ? 30 : $totalDaysInMonth;

            foreach ($structures as $ss) {
                $emp = Employee::where('company_id', $companyId)->find($ss->employee_id);
                if (!$emp || !$emp->system_user_id) continue;

                // Get attendance logs
                $logs = AttendanceLog::where('UserID', $emp->system_user_id)
                    ->where('company_id', $companyId)
                    ->where('LogTime', '>=', $monthStart)
                    ->where('LogTime', '<=', $monthEnd . ' 23:59:59')
                    ->get();

                $byDate = [];
                foreach ($logs as $log) {
                    $date = Carbon::parse($log->LogTime)->format('Y-m-d');
                    $byDate[$date][] = $log;
                }

                $workedDays = count($byDate);

                // Week-off ('O') and holiday ('H') are PAID days — they must count as
                // present, NOT absent. Source = the attendance status table (same as the
                // monthly report), excluding any day the employee actually worked.
                $paidNonWorkingDays = Attendance::where('company_id', $companyId)
                    ->where('employee_id', $emp->system_user_id)
                    ->whereBetween('date', [$monthStart, $monthEnd])
                    ->whereIn('status', ['O', 'H'])
                    ->pluck('date')
                    ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
                    ->unique()
                    ->reject(fn($d) => isset($byDate[$d]))
                    ->count();

                $presentDays = $workedDays + $paidNonWorkingDays;
                $absentDays = max(0, $daysDivisor - $presentDays);

                // Get shift for OT/late calculation
                $schedule = ScheduleEmployee::where('employee_id', $emp->system_user_id)
                    ->where('company_id', $companyId)
                    ->whereHas('shift')
                    ->latest('updated_at')
                    ->first();
                $shift = $schedule?->shift;
                $shiftWorkingHours = $this->timeToMinutes($shift?->working_hours ?? '08:00') / 60;
                $shiftStartTime = $shift?->on_duty_time; // e.g. "09:00"

                // Get holidays for this month
                // Get all holiday dates for this month
                $holidayRecords = \App\Models\Holidays::where('company_id', $companyId)
                    ->where(function ($q) use ($monthStart, $monthEnd) {
                        $q->whereBetween('start_date', [$monthStart, $monthEnd])
                          ->orWhereBetween('end_date', [$monthStart, $monthEnd]);
                    })->get();
                $holidays = [];
                foreach ($holidayRecords as $h) {
                    $s = Carbon::parse($h->start_date);
                    $e = Carbon::parse($h->end_date);
                    while ($s->lte($e)) {
                        $holidays[] = $s->format('Y-m-d');
                        $s->addDay();
                    }
                }

                // Calculate OT hours and late minutes
                $normalOtHours = 0;
                $weekendOtHours = 0;
                $holidayOtHours = 0;
                $totalLateMinutes = 0;
                $lateDays = 0;

                foreach ($byDate as $date => $dayLogs) {
                    usort($dayLogs, fn($a, $b) => strtotime($a->LogTime) - strtotime($b->LogTime));
                    if (count($dayLogs) < 1) continue;

                    $firstIn = Carbon::parse($dayLogs[0]->LogTime);
                    $dayOfWeek = Carbon::parse($date)->dayOfWeek; // 0=Sun, 6=Sat
                    $isWeekend = in_array($dayOfWeek, [5, 6]); // Fri-Sat weekend (UAE)
                    $isHoliday = in_array($date, $holidays);

                    // Late calculation
                    if ($shiftStartTime && !$isWeekend && !$isHoliday) {
                        $expectedIn = Carbon::parse($date . ' ' . $shiftStartTime);
                        $lateMinutes = max(0, $firstIn->diffInMinutes($expectedIn, false));
                        if ($lateMinutes > 0) {
                            $totalLateMinutes += $lateMinutes;
                            $lateDays++;
                        }
                    }

                    // OT calculation with different multipliers
                    if ($ss->overtime_eligible && count($dayLogs) >= 2) {
                        $last = Carbon::parse(end($dayLogs)->LogTime);
                        $workedHours = $firstIn->diffInMinutes($last) / 60;
                        if ($workedHours > $shiftWorkingHours) {
                            $extraHours = $workedHours - $shiftWorkingHours;
                            if ($isHoliday) $holidayOtHours += $extraHours;
                            elseif ($isWeekend) $weekendOtHours += $extraHours;
                            else $normalOtHours += $extraHours;
                        }
                    }
                }

                // OT amount with separate multipliers from settings
                $baseOtRate = ($daysDivisor > 0 && $workingHrsPerDay > 0) ? $ss->basic_salary / $daysDivisor / $workingHrsPerDay : 0;
                $otAmount = round(
                    ($normalOtHours * $baseOtRate * $normalOtMultiplier) +
                    ($weekendOtHours * $baseOtRate * $weekendOtMultiplier) +
                    ($holidayOtHours * $baseOtRate * $holidayOtMultiplier),
                    2
                );
                $otHours = round($normalOtHours + $weekendOtHours + $holidayOtHours, 2);

                // Late deduction based on settings
                $lateDeduction = 0;
                if ($daysDivisor > 0 && $workingHrsPerDay > 0 && $totalLateMinutes > 0) {
                    if ($lateDeductionMode === 'slab_based' && !empty($lateSlabs)) {
                        $lateDailyRate = $ss->basic_salary / $daysDivisor;
                        foreach ($lateSlabs as $slab) {
                            $from = $slab['fromMinutes'] ?? 0;
                            $to = $slab['toMinutes'] ?? 999999;
                            if ($totalLateMinutes >= $from && $totalLateMinutes <= $to) {
                                $type = $slab['deductionType'] ?? 'no_deduction';
                                if ($type === 'half_day') $lateDeduction = round($lateDailyRate * 0.5, 2);
                                elseif ($type === 'full_day') $lateDeduction = round($lateDailyRate, 2);
                                elseif ($type === 'two_days') $lateDeduction = round($lateDailyRate * 2, 2);
                                elseif ($type === 'percentage') $lateDeduction = round($ss->basic_salary * ($slab['value'] ?? 0) / 100, 2);
                                elseif ($type === 'fixed_amount') $lateDeduction = round($slab['value'] ?? 0, 2);
                                break;
                            }
                        }
                    } elseif ($lateDeductionMode === 'per_minute') {
                        $perMinuteRate = $ss->basic_salary / $daysDivisor / $workingHrsPerDay / 60;
                        $lateDeduction = round($totalLateMinutes * $perMinuteRate, 2);
                    } elseif ($lateDeductionMode === 'per_hour') {
                        $perHourRate = $ss->basic_salary / $daysDivisor / $workingHrsPerDay;
                        $lateDeduction = round(($totalLateMinutes / 60) * $perHourRate, 2);
                    }
                }

                // Adjustments
                $adjustments = PayrollAdjustment::where('company_id', $companyId)
                    ->where('employee_id', $ss->employee_id)
                    ->where('payroll_month', $month)
                    ->get();

                $bonus = $adjustments->where('type', 'bonus')->sum('amount');
                $incentive = $adjustments->where('type', 'incentive')->sum('amount');
                $arrears = $adjustments->where('type', 'arrears')->sum('amount');
                $reimbursement = $adjustments->where('type', 'reimbursement')->sum('amount');
                $fineAmount = $adjustments->where('type', 'fine')->sum('amount');
                $otherDed = $adjustments->where('type', 'other_deduction')->sum('amount');

                // Leave-aware absence deduction
                // Get approved leaves for this month and check paid/unpaid
                $approvedLeaves = EmployeeLeaves::where('employee_id', $ss->employee_id)
                    ->where('company_id', $companyId)
                    ->where('status', 1) // approved
                    ->where(function ($q) use ($monthStart, $monthEnd) {
                        $q->where('start_date', '<=', $monthEnd)
                          ->where('end_date', '>=', $monthStart);
                    })
                    ->with('leave_type')
                    ->get();

                $paidLeaveDays = 0;
                $unpaidLeaveDays = 0;

                foreach ($approvedLeaves as $leave) {
                    $leaveStart = Carbon::parse($leave->start_date)->max(Carbon::parse($monthStart));
                    $leaveEnd = Carbon::parse($leave->end_date)->min(Carbon::parse($monthEnd));
                    $leaveDaysCount = $leaveStart->diffInDays($leaveEnd) + 1;

                    $isPaid = $leave->leave_type?->paid ?? false;

                    if ($isPaid) {
                        $paidLeaveDays += $leaveDaysCount;
                    } else {
                        $unpaidLeaveDays += $leaveDaysCount;
                    }
                }

                // Split: absence (no leave) vs unpaid leave deduction
                $totalLeaveDays = $paidLeaveDays + $unpaidLeaveDays;
                // Ensure leave days don't exceed total absent days
                if ($totalLeaveDays > $absentDays) {
                    // More leave days than absent days (employee was present on some leave days)
                    // Adjust: paid leave takes priority, then unpaid
                    $paidLeaveDays = min($paidLeaveDays, $absentDays);
                    $unpaidLeaveDays = min($unpaidLeaveDays, max(0, $absentDays - $paidLeaveDays));
                    $totalLeaveDays = $paidLeaveDays + $unpaidLeaveDays;
                }
                $pureAbsentDays = max(0, $absentDays - $totalLeaveDays);
                $dailyRate = $daysDivisor > 0 ? $ss->basic_salary / $daysDivisor : 0;

                // Absence deduction = only days with NO leave applied
                $absenceDeduction = round($dailyRate * $pureAbsentDays, 2);
                // Leave deduction = only UNPAID leave days
                $leaveDeduction = round($dailyRate * $unpaidLeaveDays, 2);

                // Loan deduction
                $loanDed = 0;
                $activeLoan = null;
                $loanBalanceBefore = 0;
                if ($ss->loan_deduction) {
                    $activeLoan = EmployeeLoan::where('employee_id', $ss->employee_id)
                        ->where('company_id', $companyId)->where('status', 'active')->first();
                    if ($activeLoan && $activeLoan->outstanding_balance > 0) {
                        $loanBalanceBefore = (float) $activeLoan->outstanding_balance;
                        $loanDed = min($activeLoan->monthly_installment, $activeLoan->outstanding_balance);
                        $activeLoan->outstanding_balance -= $loanDed;
                        if ($activeLoan->outstanding_balance <= 0) $activeLoan->status = 'completed';
                        $activeLoan->save();
                    }
                }

                // Advance deduction
                $advanceDed = 0;
                $activeAdv = null;
                $advanceBalanceBefore = 0;
                if ($ss->advance_deduction) {
                    $activeAdv = EmployeeAdvance::where('employee_id', $ss->employee_id)
                        ->where('company_id', $companyId)->where('status', 'active')->first();
                    if ($activeAdv && $activeAdv->outstanding_balance > 0) {
                        $advanceBalanceBefore = (float) $activeAdv->outstanding_balance;
                        $advanceDed = min($activeAdv->monthly_recovery, $activeAdv->outstanding_balance);
                        $activeAdv->outstanding_balance -= $advanceDed;
                        if ($activeAdv->outstanding_balance <= 0) $activeAdv->status = 'completed';
                        $activeAdv->save();
                    }
                }

                $totalAllowances = $ss->house_allowance + $ss->transport_allowance + $ss->food_allowance + $ss->medical_allowance + $ss->other_allowance;
                $grossEarned = $ss->basic_salary + $totalAllowances + $otAmount + $bonus + $incentive + $arrears + $reimbursement;
                $totalDeduction = $absenceDeduction + $leaveDeduction + $lateDeduction + $loanDed + $advanceDed + $fineAmount + $otherDed;
                $netSalary = $grossEarned - $totalDeduction;

                // Apply rounding rule from settings
                if ($roundingRule === 'round') $netSalary = round($netSalary);
                elseif ($roundingRule === 'floor') $netSalary = floor($netSalary);
                elseif ($roundingRule === 'ceil') $netSalary = ceil($netSalary);

                $payrollRecord = PayrollRecord::create([
                    'batch_id' => $batch->id,
                    'company_id' => $companyId,
                    'branch_id' => $emp->branch_id,
                    'employee_id' => $ss->employee_id,
                    'month' => $month,
                    'present_days' => $presentDays,
                    'absent_days' => $pureAbsentDays,
                    'paid_leave_days' => $paidLeaveDays,
                    'unpaid_leave_days' => $unpaidLeaveDays,
                    'late_days' => $lateDays,
                    'late_minutes' => $totalLateMinutes,
                    'ot_hours' => round($otHours, 2),
                    'basic_salary' => $ss->basic_salary,
                    'house_allowance' => $ss->house_allowance,
                    'transport_allowance' => $ss->transport_allowance,
                    'food_allowance' => $ss->food_allowance,
                    'medical_allowance' => $ss->medical_allowance,
                    'other_allowance' => $ss->other_allowance,
                    'total_allowances' => $totalAllowances,
                    'ot_amount' => $otAmount,
                    'bonus' => $bonus,
                    'incentive' => $incentive,
                    'arrears' => $arrears,
                    'reimbursement' => $reimbursement,
                    'gross_earned' => $grossEarned,
                    'absence_deduction' => $absenceDeduction,
                    'leave_deduction' => $leaveDeduction,
                    'late_deduction' => $lateDeduction,
                    'loan_deduction' => $loanDed,
                    'advance_deduction' => $advanceDed,
                    'fine_amount' => $fineAmount,
                    'other_deduction' => $otherDed,
                    'total_deduction' => $totalDeduction,
                    'net_salary' => $netSalary,
                    'status' => 'draft',
                ]);

                if ($activeLoan && $loanDed > 0) {
                    LoanDeduction::create([
                        'company_id' => $companyId,
                        'branch_id' => $emp->branch_id,
                        'employee_id' => $ss->employee_id,
                        'loan_id' => $activeLoan->id,
                        'payroll_batch_id' => $batch->id,
                        'payroll_record_id' => $payrollRecord->id,
                        'payroll_month' => $month,
                        'amount' => $loanDed,
                        'balance_before' => $loanBalanceBefore,
                        'balance_after' => $loanBalanceBefore - $loanDed,
                        'deducted_at' => now(),
                    ]);
                }

                if ($activeAdv && $advanceDed > 0) {
                    AdvanceDeduction::create([
                        'company_id' => $companyId,
                        'branch_id' => $emp->branch_id,
                        'employee_id' => $ss->employee_id,
                        'advance_id' => $activeAdv->id,
                        'payroll_batch_id' => $batch->id,
                        'payroll_record_id' => $payrollRecord->id,
                        'payroll_month' => $month,
                        'amount' => $advanceDed,
                        'balance_before' => $advanceBalanceBefore,
                        'balance_after' => $advanceBalanceBefore - $advanceDed,
                        'deducted_at' => now(),
                    ]);
                }

                $totalGross += $grossEarned;
                $totalDed += $totalDeduction;
                $totalNet += $netSalary;
            }

            $batch->update([
                'total_employees' => $structures->count(),
                'total_gross' => $totalGross,
                'total_deductions' => $totalDed,
                'total_net' => $totalNet,
            ]);

            DB::commit();

            return response()->json([
                'status' => true,
                'message' => "Payroll generated for {$structures->count()} employees",
                'data' => $batch->fresh(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ── Approve Batch ──
    public function approveBatch(Request $request, $id)
    {
        $batch = PayrollBatch::where('company_id', $request->company_id)->findOrFail($id);
        $batch->update(['status' => 'approved', 'approved_by' => $request->user_id, 'approved_at' => now()]);
        PayrollRecord::where('batch_id', $id)->update(['status' => 'approved']);
        return response()->json(['status' => true, 'message' => 'Batch approved']);
    }

    // ── Mark as Paid ──
    public function markPaid(Request $request, $id)
    {
        $batch = PayrollBatch::where('company_id', $request->company_id)->findOrFail($id);
        $batch->update(['status' => 'paid', 'paid_at' => now()]);
        PayrollRecord::where('batch_id', $id)->update(['status' => 'paid']);
        return response()->json(['status' => true, 'message' => 'Batch marked as paid']);
    }

    // ── Download Payslip PDF ──
    public function downloadPayslip(Request $request, $recordId)
    {
        $record = PayrollRecord::where('company_id', $request->company_id)
            ->with('employee', 'employee.branch', 'employee.department', 'employee.designation', 'employee.bank')
            ->findOrFail($recordId);

        $currency = PayrollConfig::where('company_id', $request->company_id)->value('currency') ?? 'AED';

        // Generate simple HTML payslip
        $html = view('pdf.payslip-new', ['record' => $record, 'currency' => $currency])->render();

        return response($html)->header('Content-Type', 'text/html');
    }

    // ── Bulk Download All Payslips ──
    public function bulkPayslips(Request $request)
    {
        $companyId = $request->company_id;
        $month = $request->month;
        $batchId = $request->batch_id;

        $query = PayrollRecord::where('company_id', $companyId)
            ->with('employee', 'employee.branch', 'employee.department', 'employee.designation', 'employee.bank');

        if ($batchId) {
            $query->where('batch_id', $batchId);
        } elseif ($month) {
            $batch = \App\Models\PayrollBatch::where('company_id', $companyId)
                ->where('month', $month)
                ->latest('id')
                ->first();
            if ($batch) {
                $query->where('batch_id', $batch->id);
            }
        }

        if ($request->filled('record_ids')) {
            $query->whereIn('id', explode(',', $request->record_ids));
        }

        if ($request->filled('employee_ids')) {
            $ids = is_array($request->employee_ids) ? $request->employee_ids : explode(',', $request->employee_ids);
            $ids = array_filter($ids, fn($v) => $v !== '' && $v !== null);
            if (!empty($ids)) $query->whereIn('employee_id', $ids);
        }

        if ($request->filled('branch_ids')) {
            $ids = is_array($request->branch_ids) ? $request->branch_ids : explode(',', $request->branch_ids);
            $ids = array_filter($ids, fn($v) => $v !== '' && $v !== null);
            if (!empty($ids)) $query->whereHas('employee', fn($q) => $q->whereIn('branch_id', $ids));
        }

        if ($request->filled('department_ids')) {
            $ids = is_array($request->department_ids) ? $request->department_ids : explode(',', $request->department_ids);
            $ids = array_filter($ids, fn($v) => $v !== '' && $v !== null);
            if (!empty($ids)) $query->whereHas('employee', fn($q) => $q->whereIn('department_id', $ids));
        }

        if ($request->filled('employee_types')) {
            $types = is_array($request->employee_types) ? $request->employee_types : explode(',', $request->employee_types);
            $types = array_filter($types, fn($v) => $v !== '' && $v !== null);
            if (!empty($types)) $query->whereHas('employee', fn($q) => $q->whereIn('employee_type', $types));
        }

        $records = $query->orderBy('id')->get();

        if ($records->isEmpty()) {
            return response('<h1>No payslip records found</h1>', 404)->header('Content-Type', 'text/html');
        }

        // Compute per-type attachment flags from the live payroll_adjustments table.
        // We do not persist these on the payroll_records row (no DB change), so we
        // look them up here when rendering the payslip PDF.
        $adjFlags = PayrollAdjustment::query()
            ->where('company_id', $companyId)
            ->whereIn('employee_id', $records->pluck('employee_id')->unique())
            ->whereIn('payroll_month', $records->pluck('payroll_month')->unique())
            ->whereNotNull('attachment')
            ->get(['employee_id', 'payroll_month', 'type']);

        $flagMap = [];
        foreach ($adjFlags as $row) {
            $key = $row->employee_id . '|' . $row->payroll_month;
            $flagMap[$key][$row->type] = true;
        }

        foreach ($records as $r) {
            $key = $r->employee_id . '|' . $r->payroll_month;
            $r->bonus_has_attachment           = $flagMap[$key]['bonus']           ?? false;
            $r->incentive_has_attachment       = $flagMap[$key]['incentive']       ?? false;
            $r->arrears_has_attachment         = $flagMap[$key]['arrears']         ?? false;
            $r->reimbursement_has_attachment   = $flagMap[$key]['reimbursement']   ?? false;
            $r->fine_has_attachment            = $flagMap[$key]['fine']            ?? false;
            $r->other_deduction_has_attachment = $flagMap[$key]['other_deduction'] ?? false;
        }

        $currency = PayrollConfig::where('company_id', $companyId)->value('currency') ?? 'AED';

        // Render first payslip to get full HTML with styles
        $firstHtml = view('pdf.payslip-new', ['record' => $records[0], 'currency' => $currency])->render();

        // Extract styles from the first payslip
        $styles = '';
        if (preg_match('/<style>(.*?)<\/style>/is', $firstHtml, $styleMatch)) {
            $styles = $styleMatch[1];
        }

        // Build combined HTML with all payslips
        $combined = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>'
            . $styles
            . ' .page-break { page-break-after: always; break-after: page; margin-bottom: 0; }'
            . ' .page-break:last-child { page-break-after: avoid; }'
            . '</style></head><body>';

        foreach ($records as $i => $record) {
            $html = view('pdf.payslip-new', ['record' => $record, 'currency' => $currency])->render();

            // Extract body content
            $bodyContent = $html;
            if (preg_match('/<body[^>]*>(.*)<\/body>/is', $html, $matches)) {
                $bodyContent = $matches[1];
            }

            $combined .= '<div class="page-break">' . $bodyContent . '</div>';
        }

        $combined .= '</body></html>';

        return response($combined)->header('Content-Type', 'text/html');
    }

    // ── Loan & Advance Statement ──
    public function loanAdvanceStatement(Request $request, $employeeId)
    {
        $companyId = (int) $request->company_id;
        if (! $companyId) {
            return response('<h1>Missing company_id</h1>', 422)->header('Content-Type', 'text/html');
        }

        $employee = Employee::with(['branch', 'department', 'designation', 'company'])
            ->where('company_id', $companyId)
            ->findOrFail($employeeId);

        $loans = EmployeeLoan::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderByDesc('id')
            ->get();

        $advances = EmployeeAdvance::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderByDesc('id')
            ->get();

        $loanDeductions = LoanDeduction::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->orderBy('payroll_month')
            ->get()
            ->groupBy('loan_id');

        $advanceDeductions = AdvanceDeduction::where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->orderBy('payroll_month')
            ->get()
            ->groupBy('advance_id');

        $currency = PayrollConfig::where('company_id', $companyId)->value('currency') ?? 'AED';

        $html = view('pdf.loan-advance-statement', [
            'employee' => $employee,
            'loans' => $loans,
            'advances' => $advances,
            'loanDeductions' => $loanDeductions,
            'advanceDeductions' => $advanceDeductions,
            'currency' => $currency,
            'activeLoanCount' => $loans->where('status', 'active')->count(),
            'activeAdvanceCount' => $advances->where('status', 'active')->count(),
            'completedLoanCount' => $loans->where('status', 'completed')->count(),
            'completedAdvanceCount' => $advances->where('status', 'completed')->count(),
        ])->render();

        return response($html)->header('Content-Type', 'text/html');
    }

    // ── Report Export ──
    public function exportReport(Request $request)
    {
        $companyId = $request->company_id;
        $month = $request->month ?? date('Y-m');
        $reportType = $request->report_type;
        $format = $request->format ?? 'csv';

        $batch = PayrollBatch::where('company_id', $companyId)->where('month', $month)->latest('id')->first();
        if (!$batch) {
            return response()->json(['status' => false, 'message' => 'No payroll batch found for this month'], 404);
        }

        $query = PayrollRecord::where('batch_id', $batch->id)
            ->with('employee:id,first_name,last_name,employee_id,department_id,branch_id,employee_type')
            ->with('employee.department:id,name')
            ->with('employee.branch:id,branch_name');

        if ($request->filled('employee_ids')) {
            $ids = is_array($request->employee_ids) ? $request->employee_ids : explode(',', $request->employee_ids);
            $ids = array_filter($ids, fn($v) => $v !== '' && $v !== null);
            if (!empty($ids)) $query->whereIn('employee_id', $ids);
        }

        if ($request->filled('branch_ids')) {
            $ids = is_array($request->branch_ids) ? $request->branch_ids : explode(',', $request->branch_ids);
            $ids = array_filter($ids, fn($v) => $v !== '' && $v !== null);
            if (!empty($ids)) $query->whereHas('employee', fn($q) => $q->whereIn('branch_id', $ids));
        }

        if ($request->filled('department_ids')) {
            $ids = is_array($request->department_ids) ? $request->department_ids : explode(',', $request->department_ids);
            $ids = array_filter($ids, fn($v) => $v !== '' && $v !== null);
            if (!empty($ids)) $query->whereHas('employee', fn($q) => $q->whereIn('department_id', $ids));
        }

        if ($request->filled('employee_types')) {
            $types = is_array($request->employee_types) ? $request->employee_types : explode(',', $request->employee_types);
            $types = array_filter($types, fn($v) => $v !== '' && $v !== null);
            if (!empty($types)) $query->whereHas('employee', fn($q) => $q->whereIn('employee_type', $types));
        }

        $records = $query->get();

        $rows = [];
        $headers = [];

        switch ($reportType) {
            case 'register':
                $headers = ['Employee', 'ID', 'Department', 'Basic', 'Allowances', 'OT', 'Gross', 'Deductions', 'Net Salary', 'Status'];
                foreach ($records as $r) {
                    $rows[] = [
                        $r->employee ? "{$r->employee->first_name} {$r->employee->last_name}" : "Emp {$r->employee_id}",
                        $r->employee?->employee_id ?? $r->employee_id,
                        $r->employee?->department?->name ?? '---',
                        $r->basic_salary, $r->total_allowances, $r->ot_amount, $r->gross_earned,
                        $r->total_deduction, $r->net_salary, $r->status,
                    ];
                }
                break;
            case 'dept_summary':
                $headers = ['Department', 'Employees', 'Total Gross', 'Total Deductions', 'Total Net'];
                $grouped = $records->groupBy(fn($r) => $r->employee?->department?->name ?? 'Other');
                foreach ($grouped as $dept => $deptRecords) {
                    $rows[] = [$dept, $deptRecords->count(), $deptRecords->sum('gross_earned'), $deptRecords->sum('total_deduction'), $deptRecords->sum('net_salary')];
                }
                break;
            case 'deduction':
                $headers = ['Employee', 'ID', 'Absence', 'Late', 'Loan', 'Advance', 'Fine', 'Other', 'Total Deduction'];
                foreach ($records as $r) {
                    $rows[] = [
                        $r->employee ? "{$r->employee->first_name} {$r->employee->last_name}" : "Emp {$r->employee_id}",
                        $r->employee?->employee_id ?? $r->employee_id,
                        $r->absence_deduction, $r->late_deduction, $r->loan_deduction,
                        $r->advance_deduction, $r->fine_amount, $r->other_deduction, $r->total_deduction,
                    ];
                }
                break;
            case 'overtime':
                $headers = ['Employee', 'ID', 'OT Hours', 'OT Amount'];
                foreach ($records->where('ot_hours', '>', 0) as $r) {
                    $rows[] = [
                        $r->employee ? "{$r->employee->first_name} {$r->employee->last_name}" : "Emp {$r->employee_id}",
                        $r->employee?->employee_id ?? $r->employee_id,
                        $r->ot_hours, $r->ot_amount,
                    ];
                }
                break;
            case 'loan_recovery':
                $headers = ['Employee', 'ID', 'Loan Deduction'];
                foreach ($records->where('loan_deduction', '>', 0) as $r) {
                    $rows[] = [
                        $r->employee ? "{$r->employee->first_name} {$r->employee->last_name}" : "Emp {$r->employee_id}",
                        $r->employee?->employee_id ?? $r->employee_id,
                        $r->loan_deduction,
                    ];
                }
                break;
            case 'advance_recovery':
                $headers = ['Employee', 'ID', 'Advance Deduction'];
                foreach ($records->where('advance_deduction', '>', 0) as $r) {
                    $rows[] = [
                        $r->employee ? "{$r->employee->first_name} {$r->employee->last_name}" : "Emp {$r->employee_id}",
                        $r->employee?->employee_id ?? $r->employee_id,
                        $r->advance_deduction,
                    ];
                }
                break;
            default:
                $headers = ['Employee', 'ID', 'Basic', 'Gross', 'Net'];
                foreach ($records as $r) {
                    $rows[] = [
                        $r->employee ? "{$r->employee->first_name} {$r->employee->last_name}" : "Emp {$r->employee_id}",
                        $r->employee?->employee_id ?? $r->employee_id,
                        $r->basic_salary, $r->gross_earned, $r->net_salary,
                    ];
                }
        }

        // CSV download
        $filename = "{$reportType}_{$month}.csv";
        $callback = function () use ($headers, $rows) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);
            foreach ($rows as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ── Payroll Settings ──
    public function getSettings(Request $request)
    {
        $config = PayrollConfig::where('company_id', $request->company_id)->first();
        if (!$config) {
            // Return defaults
            return response()->json([
                'days_mode' => 'fixed_30',
                'working_hours_per_day' => 8,
                'salary_mode' => 'gross_based',
                'currency' => 'AED',
                'normal_ot_multiplier' => 1.25,
                'weekend_ot_multiplier' => 1.50,
                'holiday_ot_multiplier' => 2.00,
                'late_deduction_mode' => 'slab_based',
                'leave_deduction_enabled' => true,
                'rounding_rule' => 'none',
                'late_slabs' => [],
                'approval_levels' => 1,
                'lock_after_approval' => true,
            ]);
        }
        return response()->json($config);
    }

    public function saveSettings(Request $request)
    {
        $data = $request->only([
            'days_mode', 'working_hours_per_day', 'salary_mode', 'currency',
            'normal_ot_multiplier', 'weekend_ot_multiplier', 'holiday_ot_multiplier',
            'late_deduction_mode', 'leave_deduction_enabled', 'rounding_rule', 'late_slabs',
            'approval_levels', 'lock_after_approval',
        ]);

        $config = PayrollConfig::updateOrCreate(
            ['company_id' => $request->company_id],
            $data
        );

        return response()->json(['status' => true, 'data' => $config]);
    }

    private function timeToMinutes($time): int
    {
        if (!$time || $time === '---') return 480; // default 8 hours
        $parts = explode(':', $time);
        return (int)($parts[0] ?? 0) * 60 + (int)($parts[1] ?? 0);
    }
}
