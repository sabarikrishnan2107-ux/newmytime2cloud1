<?php

use App\Http\Controllers\AssignedDepartmentEmployeeController;
use Illuminate\Support\Facades\Route;

Route::apiResource('assigned-department-employee', AssignedDepartmentEmployeeController::class);
Route::get('assigned-department-employee-list', [AssignedDepartmentEmployeeController::class, 'assigned_department_employee_list']);
Route::get('assigned-employee-list', [AssignedDepartmentEmployeeController::class, 'assigned_employee_list']);
Route::get('employee_managers_list_all', [AssignedDepartmentEmployeeController::class, 'employee_managers_list_all']);
