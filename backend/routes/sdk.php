<?php

use App\Http\Controllers\RecordController;
use App\Http\Controllers\SDKController;
use Illuminate\Support\Facades\Route;

Route::post('/setUserExpiry/{id}', [SDKController::class, 'setUserExpiry']);

Route::get('/get_devices', [RecordController::class, 'get_devices']);

Route::get('/get_logs_from_sdk', [RecordController::class, 'get_logs_from_sdk']);

Route::post('/getDevicesCountForTimezone', [SDKController::class, 'getDevicesCountForTimezone']);
Route::post('/{id}/WriteTimeGroup', [SDKController::class, 'processTimeGroup']);
Route::post('/{id}/WriteResetDefaultTimeGroup', [SDKController::class, 'WriteResetDefaultTimeGroup']);




//Route::post('/Person/AddRange', [SDKController::class, 'PersonAddRange']);
// Route::post('/Person/AddRange/Photos', [SDKController::class, 'PersonAddRangePhotos']);

Route::post('/SDK/AddPerson', [SDKController::class, 'AddPerson']);
Route::post('/SDK/{id}/{command}', [SDKController::class, 'handleCommand']);
Route::get('/SDK/get-device-person-details/{device_id}/{user_code}', [SDKController::class, 'getPersonDetails']);
Route::delete('/SDK/delete-device-person-details/{device_id}', [SDKController::class, 'deletePersonDetails']);
Route::get('/SDK/device-employee-logs', [SDKController::class, 'deviceRequestLogs']);



Route::get('/SDK/get-person-all-v1/{device_id}', [SDKController::class, 'getPersonAllV1']);
Route::get('/SDK/get-person-details-v1/{device_id}/{user_code}', [SDKController::class, 'getPersonDetailsV1']);
