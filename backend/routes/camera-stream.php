<?php

use App\Http\Controllers\CameraStreamController;
use Illuminate\Support\Facades\Route;

Route::get('cameras', [CameraStreamController::class, 'index']);
Route::post('camera/test-connection', [CameraStreamController::class, 'testConnection']);
Route::get('camera/{deviceId}/status', [CameraStreamController::class, 'status']);
Route::get('camera/{deviceId}/credentials', [CameraStreamController::class, 'credentials']);
Route::post('camera/attendance-log', [CameraStreamController::class, 'logAttendance']);
