<?php

use App\Http\Controllers\API\ClientController;
use Illuminate\Support\Facades\Route;
use Spatie\FlareClient\Api;

Route::post('company/{id}/regnerate_access_token', [ClientController::class, "generateToken"]);
Route::post('get_attendance_logs', [ClientController::class, "getAttendanceLogs"]);
Route::post('get_attendance_reports', [ClientController::class, "getAttendanceReports"]);
Route::post('get_employees_list', [ClientController::class, "getEmployeesList"]);

Route::get('company/{id}/regnerate_access_token', [ClientController::class, "test"]);
Route::get('get_attendance_logs', [ClientController::class, "test"]);
Route::get('get_attendance_reports', [ClientController::class, "test"]);
Route::get('get_employees_list', [ClientController::class, "test"]);



Route::get('download_postman_json', [ClientController::class, 'downloadPostmanJson']);
