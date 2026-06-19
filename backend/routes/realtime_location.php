<?php

use App\Http\Controllers\RealTimeLocationController;
use Illuminate\Support\Facades\Route;

Route::get('/realtime_location', [RealTimeLocationController::class, 'index']);
Route::post('/realtime_location', [RealTimeLocationController::class, 'store']);

// Mobile-app-friendly alias. Accepts { employee_id, company_id, latitude, longitude,
// status, logged_at } and maps to the real_time_locations table, validating that the
// employee actually belongs to the posted company_id so one tenant cannot write into
// another tenant's trail.
Route::post('/employee/location-log', [RealTimeLocationController::class, 'logLocation']);
Route::get('/employee/location-log', [RealTimeLocationController::class, 'listLocationLogs']);
