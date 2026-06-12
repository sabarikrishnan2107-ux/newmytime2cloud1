<?php

use App\Http\Controllers\PayrollManagementController;
use Illuminate\Support\Facades\Route;

// Employee list for dropdowns
Route::get('payroll-management/employees', [PayrollManagementController::class, 'employeeList']);

// Dashboard
Route::get('payroll-management/dashboard', [PayrollManagementController::class, 'dashboardStats']);

// Employee Salary Structure (for Employee Edit page)
Route::get('payroll-management/employee-salary/{employeeId}', [PayrollManagementController::class, 'employeeSalaryStructure']);
Route::post('payroll-management/employee-salary/{employeeId}', [PayrollManagementController::class, 'upsertEmployeeSalaryStructure']);

// Salary Structures
Route::get('payroll-management/salary-structures', [PayrollManagementController::class, 'salaryStructures']);
Route::post('payroll-management/salary-structures', [PayrollManagementController::class, 'storeSalaryStructure']);
Route::put('payroll-management/salary-structures/{id}', [PayrollManagementController::class, 'updateSalaryStructure']);
Route::delete('payroll-management/salary-structures/{id}', [PayrollManagementController::class, 'deleteSalaryStructure']);

// Adjustments
Route::get('payroll-management/adjustments', [PayrollManagementController::class, 'adjustments']);
Route::post('payroll-management/adjustments', [PayrollManagementController::class, 'storeAdjustment']);
Route::delete('payroll-management/adjustments/{id}', [PayrollManagementController::class, 'deleteAdjustment']);

// Loans
Route::get('payroll-management/loans', [PayrollManagementController::class, 'loans']);
Route::post('payroll-management/loans', [PayrollManagementController::class, 'storeLoan']);
Route::put('payroll-management/loans/{id}', [PayrollManagementController::class, 'updateLoan']);
Route::delete('payroll-management/loans/{id}', [PayrollManagementController::class, 'deleteLoan']);

// Advances
Route::get('payroll-management/advances', [PayrollManagementController::class, 'advances']);
Route::post('payroll-management/advances', [PayrollManagementController::class, 'storeAdvance']);
Route::put('payroll-management/advances/{id}', [PayrollManagementController::class, 'updateAdvance']);
Route::delete('payroll-management/advances/{id}', [PayrollManagementController::class, 'deleteAdvance']);

// Batches
Route::get('payroll-management/batches', [PayrollManagementController::class, 'batches']);

// Payroll Records
Route::get('payroll-management/records/{batchId}', [PayrollManagementController::class, 'records']);

// Generate, Approve, Pay
Route::post('payroll-management/generate', [PayrollManagementController::class, 'generatePayroll']);
Route::post('payroll-management/approve/{id}', [PayrollManagementController::class, 'approveBatch']);
Route::post('payroll-management/mark-paid/{id}', [PayrollManagementController::class, 'markPaid']);

// Staff Payslips (for employee self-service)
Route::get('payroll-management/staff-payslips', function (\Illuminate\Http\Request $request) {
    $employeeIdRaw = $request->employee_id;
    $requestCompanyId = $request->company_id ? (int) $request->company_id : null;
    $limit = (int) ($request->limit ?? 100);

    if (!$employeeIdRaw) return [];

    // Resolve canonical employee record (works whether PK or system_user_id was passed)
    $empQuery = \App\Models\Employee::where(function ($q) use ($employeeIdRaw) {
        $q->where('id', $employeeIdRaw)->orWhere('system_user_id', $employeeIdRaw);
    });
    $emp = $requestCompanyId
        ? (clone $empQuery)->where('company_id', $requestCompanyId)->first(['id', 'system_user_id', 'company_id'])
        : null;
    if (!$emp) $emp = $empQuery->first(['id', 'system_user_id', 'company_id']);
    if (!$emp) return [];

    $companyId = (int) $emp->company_id;
    $sysId = $emp->system_user_id;
    $pkId = $emp->id;

    // Read currency from PayrollConfig. Try the employee's company first;
    // fall back to the request's company_id (handles cross-company admin views).
    $currency = \App\Models\PayrollConfig::where('company_id', $companyId)->value('currency');
    if (!$currency && $requestCompanyId && $requestCompanyId !== $companyId) {
        $currency = \App\Models\PayrollConfig::where('company_id', $requestCompanyId)->value('currency');
    }
    $currency = $currency ? trim($currency) : 'AED';
    if ($currency === '') $currency = 'AED';

    // Try the new payroll_records table first
    $newQuery = \App\Models\PayrollRecord::where('company_id', $companyId)
        ->where(function ($q) use ($sysId, $pkId) {
            $q->where('employee_id', $sysId)->orWhere('employee_id', $pkId);
        });
    if ($request->year) {
        $newQuery->where('month', 'like', $request->year . '%');
    }
    $newRecords = $newQuery->orderBy('month', 'desc')->limit($limit)->get();

    if ($newRecords->isNotEmpty()) {
        return $newRecords->map(function ($r) use ($currency) {
            $monthNum = (int) substr($r->month, 5, 2) - 1;
            return [
                'id' => $r->id,
                'month' => $monthNum,
                'year' => (int) substr($r->month, 0, 4),
                'basic_salary' => $r->basic_salary,
                'net_salary' => $r->net_salary,
                'final_salary' => $r->net_salary,
                'total_allowances' => $r->total_allowances,
                'ot_amount' => $r->ot_amount,
                'gross_earned' => $r->gross_earned,
                'total_deduction' => $r->total_deduction,
                'bonus' => $r->bonus,
                'incentive' => $r->incentive,
                'status' => $r->status,
                'batch_month' => $r->month,
                'paid_at' => $r->updated_at?->toIso8601String(),
                'currency' => $currency,
                'source' => 'payroll_records',
            ];
        });
    }

    // Fall back to the legacy payslips table (production data lives here)
    $legacyQuery = \App\Models\Payslips::where('company_id', $companyId)
        ->where(function ($q) use ($sysId, $pkId) {
            $q->where('employee_id', $sysId)
              ->orWhere('employee_table_id', $pkId);
        });
    if ($request->year) {
        $legacyQuery->where('year', $request->year);
    }
    $legacy = $legacyQuery->orderBy('year', 'desc')->orderBy('month', 'desc')->limit($limit)->get();

    if ($legacy->isEmpty()) {
        // Always return at least one stub record carrying the currency so the
        // frontend can read it even when the employee has no payslips yet.
        return [[
            'id' => null,
            'month' => null,
            'year' => null,
            'basic_salary' => 0,
            'net_salary' => 0,
            'final_salary' => 0,
            'total_allowances' => 0,
            'ot_amount' => 0,
            'gross_earned' => 0,
            'total_deduction' => 0,
            'bonus' => 0,
            'incentive' => 0,
            'status' => null,
            'batch_month' => null,
            'paid_at' => null,
            'currency' => $currency,
            'source' => 'currency_only',
            'placeholder' => true,
        ]];
    }

    return $legacy->map(function ($p) use ($currency) {
        $monthIdx = max(0, min(11, ((int) $p->month) - 1));
        $basic = (float) ($p->basic_salary ?? 0);
        $net = (float) ($p->net_salary ?? 0);
        $final = (float) ($p->final_salary ?? $net);
        $allowances = max(0, $net - $basic);
        return [
            'id' => $p->id,
            'month' => $monthIdx,
            'year' => (int) $p->year,
            'basic_salary' => $basic,
            'net_salary' => $net,
            'final_salary' => $final,
            'total_allowances' => $allowances,
            'ot_amount' => 0,
            'gross_earned' => $net,
            'total_deduction' => max(0, $net - $final),
            'bonus' => 0,
            'incentive' => 0,
            'status' => 'paid',
            'batch_month' => sprintf('%04d-%02d', $p->year, (int) $p->month),
            'paid_at' => $p->updated_at?->toIso8601String(),
            'currency' => $currency,
            'source' => 'payslips_legacy',
        ];
    });
});

// Unified payslip view: works with new payroll_records OR legacy payslips data.
// Accepts employee_id (system_user_id or PK), year, month (1-12), company_id (optional, derived from employee).
Route::get('payroll-management/employee-payslip', function (\Illuminate\Http\Request $request) {
    $employeeIdRaw = $request->employee_id;
    $year = (int) $request->year;
    $month = (int) $request->month; // 1-12
    $requestCompanyId = $request->company_id ? (int) $request->company_id : null;

    if (!$employeeIdRaw || !$year || !$month) {
        return response('Missing employee_id, year, or month', 400);
    }

    // Resolve canonical employee
    $empQuery = \App\Models\Employee::where(function ($q) use ($employeeIdRaw) {
        $q->where('id', $employeeIdRaw)->orWhere('system_user_id', $employeeIdRaw);
    });
    $emp = $requestCompanyId
        ? (clone $empQuery)->where('company_id', $requestCompanyId)->first()
        : null;
    if (!$emp) $emp = $empQuery->first();
    if (!$emp) return response('Employee not found', 404);

    $emp->load('branch', 'department', 'designation', 'bank', 'company');

    $companyId = (int) $emp->company_id;
    $monthStr = sprintf('%04d-%02d', $year, $month);

    // Try the new payroll_records table first
    $record = \App\Models\PayrollRecord::where('company_id', $companyId)
        ->where(function ($q) use ($emp) {
            $q->where('employee_id', $emp->system_user_id)->orWhere('employee_id', $emp->id);
        })
        ->where('month', $monthStr)
        ->first();

    if ($record) {
        $record->setRelation('employee', $emp);
    } else {
        // Fall back to legacy payslips table
        $legacy = \App\Models\Payslips::where('company_id', $companyId)
            ->where(function ($q) use ($emp) {
                $q->where('employee_id', $emp->system_user_id)->orWhere('employee_table_id', $emp->id);
            })
            ->where('year', $year)
            ->where('month', $month)
            ->first();

        if (!$legacy) {
            return response('No payslip found for ' . $monthStr, 404);
        }

        $basic = (float) ($legacy->basic_salary ?? 0);
        $net = (float) ($legacy->net_salary ?? 0);
        $final = (float) ($legacy->final_salary ?? $net);
        $allowances = max(0, $net - $basic);
        $totalDeduction = max(0, $net - $final);

        // Build a PayrollRecord-shaped object from legacy data
        $record = new \App\Models\PayrollRecord([
            'company_id' => $companyId,
            'employee_id' => $emp->system_user_id,
            'month' => $monthStr,
            'present_days' => 0,
            'absent_days' => 0,
            'late_days' => 0,
            'late_minutes' => 0,
            'ot_hours' => 0,
            'basic_salary' => $basic,
            'house_allowance' => 0,
            'transport_allowance' => 0,
            'food_allowance' => 0,
            'medical_allowance' => 0,
            'other_allowance' => $allowances,
            'total_allowances' => $allowances,
            'ot_amount' => 0,
            'bonus' => 0,
            'incentive' => 0,
            'arrears' => 0,
            'reimbursement' => 0,
            'gross_earned' => $net,
            'absence_deduction' => 0,
            'leave_deduction' => 0,
            'unpaid_leave_days' => 0,
            'late_deduction' => 0,
            'loan_deduction' => 0,
            'advance_deduction' => 0,
            'fine_amount' => 0,
            'other_deduction' => $totalDeduction,
            'total_deduction' => $totalDeduction,
            'net_salary' => $final,
            'status' => 'paid',
        ]);
        $record->id = $legacy->id;
        $record->setRelation('employee', $emp);
    }

    $currency = \App\Models\PayrollConfig::where('company_id', $companyId)->value('currency') ?? 'AED';

    $html = view('pdf.payslip-new', ['record' => $record, 'currency' => $currency])->render();
    return response($html)->header('Content-Type', 'text/html');
});

// Payslip (by PayrollRecord id)
Route::get('payroll-management/payslip/{recordId}', [PayrollManagementController::class, 'downloadPayslip']);
Route::get('payroll-management/payslips-bulk', [PayrollManagementController::class, 'bulkPayslips']);

// Loan & Advance Statement
Route::get('payroll-management/loan-advance-statement/{employeeId}', [PayrollManagementController::class, 'loanAdvanceStatement']);

// Geo-Fence Locations (Setup)
Route::get('geofence-locations', function (\Illuminate\Http\Request $request) {
    return \App\Models\GeofenceLocation::where('company_id', $request->company_id)->orderBy('name')->get();
});
Route::post('geofence-locations', function (\Illuminate\Http\Request $request) {
    $data = $request->only(['name', 'latitude', 'longitude', 'radius']);
    $data['company_id'] = $request->company_id;
    return response()->json(\App\Models\GeofenceLocation::create($data));
});
Route::put('geofence-locations/{id}', function (\Illuminate\Http\Request $request, $id) {
    $loc = \App\Models\GeofenceLocation::where('company_id', $request->company_id)->findOrFail($id);
    $loc->update($request->only(['name', 'latitude', 'longitude', 'radius']));
    return response()->json($loc);
});
Route::delete('geofence-locations/{id}', function (\Illuminate\Http\Request $request, $id) {
    \App\Models\GeofenceLocation::where('company_id', $request->company_id)->findOrFail($id)->delete();
    return response()->json(['status' => true]);
});

// Employee Geo-Fencing
Route::get('employee-geofence/{employeeId}', function (\Illuminate\Http\Request $request, $employeeId) {
    return \App\Models\EmployeeGeofence::where('company_id', $request->company_id)->where('employee_id', $employeeId)->first();
});
Route::post('employee-geofence/{employeeId}', function (\Illuminate\Http\Request $request, $employeeId) {
    $data = $request->only(['name', 'geo_fencing_enabled', 'latitude', 'longitude', 'radius', 'geofence_location_id']);
    $data['company_id'] = $request->company_id;
    $data['employee_id'] = $employeeId;
    $geofence = \App\Models\EmployeeGeofence::updateOrCreate(
        ['company_id' => $request->company_id, 'employee_id' => $employeeId],
        $data
    );
    return response()->json(['status' => true, 'data' => $geofence]);
});

// Settings
Route::get('payroll-management/settings', [PayrollManagementController::class, 'getSettings']);
Route::post('payroll-management/settings', [PayrollManagementController::class, 'saveSettings']);

// Reports Export
Route::get('payroll-management/export-report', [PayrollManagementController::class, 'exportReport']);
