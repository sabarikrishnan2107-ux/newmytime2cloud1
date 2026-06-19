<?php

use App\Http\Controllers\Dashboards\EmployeeDashboard;
use App\Http\Controllers\Dashboards\VisitorDashboard;
use App\Http\Controllers\Reports\VisitorMonthlyController;
use App\Http\Controllers\Visitor\VisitorAttendanceRenderController;
use App\Http\Controllers\VisitorController;
use App\Http\Controllers\VisitorMappingController;
use App\Http\Controllers\VerificationController;
use Illuminate\Support\Facades\Route;


Route::get('visitor-count', VisitorDashboard::class);
Route::post('visitor/{id}', [VisitorController::class, 'update']);
Route::post('visitor-status-update/{id}', [VisitorController::class, 'visitorStatusUpdate']);

Route::apiResource('visitor', VisitorController::class);
Route::post('visitor-register', [VisitorController::class, "register"]);
Route::post('visitor-self-register', [VisitorController::class, "self_register"]);

Route::get('visitor-search', [VisitorController::class, "search"]);

Route::get('visitors_with_type', [VisitorController::class, "visitors_with_type"]);

Route::get('/get_visitors_with_timezonename', [VisitorMappingController::class, 'get_visitors_with_timezonename']);
Route::post('/visitor_timezone_mapping', [VisitorMappingController::class, "store"]);
Route::post('/visitor_test', [VisitorController::class, "store_test"]);
Route::get('/visitor_status_list', [VisitorController::class, "getVisitorStatusList"]);

Route::post('upload-visitor', [VisitorController::class, 'uploadVisitorToDevice']);
Route::post('visitor-update-zone', [VisitorController::class, 'updateVisitorToZone']);

Route::get('setVisitorExpireDates/{id}', [VisitorAttendanceRenderController::class, 'setVisitorExpireDates']);
Route::get('deleteVisitorExpireDates/{id}', [VisitorAttendanceRenderController::class, 'deleteVisitorExpireDates']);
Route::post('delete-visitor-from-devices', [VisitorAttendanceRenderController::class, 'deleteVisitorFromDevice']);


Route::get('get-notifications-count', [EmployeeDashboard::class, 'getNotificationCount']);
Route::get('get-unknown-visitors-list', [VisitorController::class, 'getUnknownVisitorsList']);

Route::post('update-pic-and-sign', [VerificationController::class, 'verifyCustomer']); // for tablet app
Route::get('get-verify-info/{code}', [VerificationController::class, 'getVerifyInfo']);
Route::post('verify-customer', [VerificationController::class, 'verifyBooking']);
