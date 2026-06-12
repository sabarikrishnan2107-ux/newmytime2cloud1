<?php

use App\Http\Controllers\AbsentController;
use App\Http\Controllers\AccessControlController;
use App\Http\Controllers\FlexibleOffController;
use App\Http\Controllers\MonthlyFlexibleHolidaysController;
use App\Http\Controllers\OffByDayController;
use App\Http\Controllers\Shift\AutoShiftController;
use App\Http\Controllers\Shift\FiloShiftController;
use App\Http\Controllers\Shift\MultiInOutShiftController;
use App\Http\Controllers\Shift\MultiShiftController;
use App\Http\Controllers\Shift\RenderController;
use App\Http\Controllers\Shift\SingleShiftController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/render_logs', [RenderController::class, 'renderLogs']);
Route::get('/render_logs_test', [RenderController::class, 'renderLogsTest']);


Route::get('render_multi_inout_report', [RenderController::class, 'renderMultiInOut']);
Route::get('render_general_report', [RenderController::class, 'renderGeneral']);

Route::get('render_off', [RenderController::class, 'renderOff']);
Route::get('render_absent', [AbsentController::class, 'renderAbsent']);

Route::get('render_flexible_off_week1', [FlexibleOffController::class, 'renderFlexibleOffWeek1']);
Route::get('render_flexible_off_week2', [FlexibleOffController::class, 'renderFlexibleOffWeek2']);

Route::get('render_off_by_day_week1', [OffByDayController::class, 'renderOffByDayWeek1']);
Route::get('render_off_by_day_week2', [OffByDayController::class, 'renderOffByDayWeek2']);


Route::get('render_monthly_flexible_holidays', [MonthlyFlexibleHolidaysController::class, 'renderMonthlyFlexibleHolidays']);

Route::get('render_off_by_day', [RenderController::class, 'renderOffByDay']);
Route::get('render_leaves/{company_id}', [RenderController::class, 'renderLeaves']);
Route::get('render_holidays/{company_id}', [RenderController::class, 'renderHolidays']);
Route::get('renderLeavesCron/{company_id}', [RenderController::class, 'renderLeavesCron']);
Route::get('renderHolidaysCron/{company_id}', [RenderController::class, 'renderHolidaysCron']);

Route::post('render_employee_report', [RenderController::class, 'renderEmployeeReport']);

Route::post('renderFiloRequest', [FiloShiftController::class, 'renderRequest']);
Route::post('renderSingleRequest', [SingleShiftController::class, 'renderRequest']);
Route::post('renderMultiRequest', [MultiShiftController::class, 'renderRequest']);




Route::get('access_control_report', [AccessControlController::class, 'index']);


Route::post('renderAutoRequest', [AutoShiftController::class, 'renderRequest']);

Route::post('/sync-multi-shift-dual-day-range', [MultiShiftController::class, 'sync']);
