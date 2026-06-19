<?php

use App\Http\Controllers\EmployeeController;
use Illuminate\Support\Facades\Route;

Route::get('/dumpEmployeesData', [EmployeeController::class, 'dumpEmployeesData']);
Route::get('/mapEmployeesData', [EmployeeController::class, 'mapEmployeesData']);
Route::get('/employeesShortList', [EmployeeController::class, 'employeesShortList']);
Route::get('/employeesDepartmentMapping/{id}', [EmployeeController::class, 'employeesDepartmentMapping']);




