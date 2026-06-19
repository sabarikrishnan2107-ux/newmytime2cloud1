<?php

use App\Http\Controllers\Visitor\RenderController;
use App\Http\Controllers\VisitorAttendanceController;
use Illuminate\Support\Facades\Route;

Route::apiResource('visitor_attendance', VisitorAttendanceController::class);


Route::post('render_daily_report', [RenderController::class, "renderDailyReport"]);
Route::get('visitor_attendance_report', [VisitorAttendanceController::class, "report"]);
Route::get('visitor_log_list', [VisitorAttendanceController::class, 'visitor_log_list']);
