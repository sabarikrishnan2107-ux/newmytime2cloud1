<?php

use App\Http\Controllers\AttendanceReportController;
use Illuminate\Support\Facades\Route;

Route::post('reports/monthly-pdf', [AttendanceReportController::class, 'monthlyPdf']);

Route::get('reports/daily-pdf', [AttendanceReportController::class, 'dailyPdf']);

Route::get('reports/monthly-pdf/status/{batchId}', [AttendanceReportController::class, 'status']);

Route::get('reports/monthly-pdf/download/{batchId}', [AttendanceReportController::class, 'download'])
    ->name('reports.monthly-pdf.download');

Route::get('reports/monthly-pdf/{employeeId}/{year}/{month}', [AttendanceReportController::class, 'singleEmployee']);
