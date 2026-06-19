<?php

use App\Http\Controllers\AttendanceController;
use Illuminate\Support\Facades\Route;


Route::get('SyncAbsent', [AttendanceController::class, 'SyncAbsent']);
Route::get('/SyncAbsentByManual', [AttendanceController::class, 'SyncAbsentByManual']);

