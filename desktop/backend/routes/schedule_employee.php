<?php

use App\Http\Controllers\ScheduleEmployeeController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::apiResource('schedule_employees', ScheduleEmployeeController::class);
Route::get('schedule_employees_logs', [ScheduleEmployeeController::class, 'logs']);
Route::post('schedule_employees_delete', [ScheduleEmployeeController::class, 'schedule_employees_delete']);
Route::get('employees_by_departments', [ScheduleEmployeeController::class, 'employees_by_departments']);
Route::put('scheduled_employee/{id}', [ScheduleEmployeeController::class, 'update']);

Route::get('scheduled_employees', [ScheduleEmployeeController::class, 'scheduled_employees']);
Route::get('not_scheduled_employees', [ScheduleEmployeeController::class, 'not_scheduled_employees']);
Route::post('schedule_employee/delete/selected', [ScheduleEmployeeController::class, 'deleteSelected']);

Route::post('schedule_employee/delete-all', [ScheduleEmployeeController::class, 'deleteAll']);


Route::post('/assignSchedule', [ScheduleEmployeeController::class, 'assignSchedule']);
Route::post('/assignScheduleByManual', [ScheduleEmployeeController::class, 'assignScheduleByManual']);


Route::get('scheduled_employees_index', [ScheduleEmployeeController::class, 'scheduled_employees_index']);

// Route::get('scheduled_employees_list', [EmployeeController::class, 'scheduled_employees_list']);
Route::get('scheduled_employees_with_type', [ScheduleEmployeeController::class, 'scheduled_employees_with_type']);
Route::get('scheduled_employees_with_type_new', [ScheduleEmployeeController::class, 'scheduled_employees_with_type_new']);
Route::get('/get_shifts_by_employee/{id}', [ScheduleEmployeeController::class, 'getShiftsByEmployee']);
Route::get('/employee_related_shift/{id}', [ScheduleEmployeeController::class, 'employee_related_shift']);

Route::get('/employees_with_schedule_count', [ScheduleEmployeeController::class, 'employeesWithScheduleCount']);
Route::get('/schedule_stats', [ScheduleEmployeeController::class, 'scheduleStats']);


// Route::get('scheduled_employees/search/{key}', [EmployeeController::class, 'scheduled_employees_search']);