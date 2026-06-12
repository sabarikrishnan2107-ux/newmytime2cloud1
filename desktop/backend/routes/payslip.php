<?php

use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\PayslipController;
use Illuminate\Support\Facades\Route;

// whatsapp
Route::get('/payslip/{id}', [PayslipController::class, 'show']);
Route::get('/payslip-by-department', [PayslipController::class, 'generateWithDepartmentId']);
Route::get('/generate-payslips-with-employeeids', [PayslipController::class, 'generateWithEmployeeids']);
Route::get('/donwload-payslip-pdf', [PayslipController::class, 'downloadPayslipPdf']);
Route::get('/generate-payslips-companyid/{id}', [PayslipController::class, 'generateWithCompanyIds']);
Route::get('/generate-payslips-zip', [PayslipController::class, 'downloadAllPayslipszip']);
Route::get('/render-payslip-by-employee', [PayslipController::class, 'renderPayslipByEmployee']);
Route::get('/get-payslip-by-employee-year', [EmployeeController::class, 'getEmployeePayslipYear']);
