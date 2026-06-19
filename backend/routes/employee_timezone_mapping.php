<?php

use App\Http\Controllers\EmployeeTimezoneMappingController;
use App\Http\Controllers\TimezoneEmployeesController;
use App\Models\TimezoneEmployees;
use Illuminate\Support\Facades\Route;

Route::apiResource('/employee_timezone_mapping', EmployeeTimezoneMappingController::class);
Route::get('/getemployees_timezoneids', [EmployeeTimezoneMappingController::class, 'get_employees_timezoneids']);
Route::get('/get_employeeswith_timezonename', [EmployeeTimezoneMappingController::class, 'get_employeeswith_timezonename']);
Route::post('/deletetimezone', [EmployeeTimezoneMappingController::class, 'deleteTimezone']);
Route::get('/gettimezonesinfo', [EmployeeTimezoneMappingController::class, 'gettimezonesinfo']);
Route::get('/gettimezonesinfo/search/{key}', [EmployeeTimezoneMappingController::class, 'gettimezonesinfo_search']);
Route::get('/get_employeeswith_timezonename_id/{id}', [EmployeeTimezoneMappingController::class, 'get_employeeswith_timezonename_id']);


Route::get('/employees_with_timezone_count', [TimezoneEmployeesController::class, 'employeesWithTimezoneCount']);
Route::post('/timezones_employees_update', [TimezoneEmployeesController::class, 'timezoneEmployeesUpdate']);
Route::get('/get_timezones_by_employee/{id}', [TimezoneEmployeesController::class, 'getTimezoneEmployeeId']);

Route::post('/timezones_device_employees_update', [TimezoneEmployeesController::class, 'timezonesDeviceEmployeesUpdate']);
