<?php

use App\Http\Controllers\DeviceCameraModel2Controller;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\DeviceStatusController;
use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Device
Route::apiResource('device', DeviceController::class);
Route::get('device-list', [DeviceController::class, 'dropdownList']);
Route::get('device-models-list', [DeviceController::class, 'deviceModelsdropdownList']);

Route::get('device-mode-list', [DeviceController::class, 'modes']);




Route::get('device/search/{key}', [DeviceController::class, 'search']);
Route::get('device-by-user/{id}', [DeviceController::class, 'getDeviceByUserId']);
Route::get('devices-array', [DeviceController::class, 'getDevicesArray']);
Route::post('device/details', [DeviceController::class, 'getDeviceCompany']);
Route::get('device/getLastRecordsByCount/{company_id}/{count}', [DeviceController::class, 'getLastRecordsByCount']);
Route::get('device/getLastRecordsHistory/{company_id}/{count}', [DeviceController::class, 'getLastRecordsHistory']);
//Route::get('device/getLastRecordsByCount', [DeviceController::class, 'getLastRecordsByCount']);
Route::post('device/delete/selected', [DeviceController::class, 'deleteSelected']);
Route::get('device_list', [DeviceController::class, 'getDeviceList']);
Route::get('device_list_not_manual', [DeviceController::class, 'getDeviceListNotManul']);

Route::get('device_list_master', [DeviceController::class, 'getDeviceListMaster']);




Route::get('devcie_count_Status/{company_id}', [DeviceController::class, 'devcieCountByStatus']);

Route::get('sync_device_date_time/{device_id}/{company_id}', [DeviceController::class, "sync_device_date_time"]);

//  Device Status
Route::apiResource('device_status', DeviceStatusController::class);
Route::get('device_status/search/{key}', [DeviceStatusController::class, 'search']);
Route::post('device_status/delete/selected', [DeviceStatusController::class, 'deleteSelected']);


Route::post('update_devices_active_settings/{key}', [DeviceController::class, 'updateActiveTimeSettings']);
Route::get('get_device_active_settings/{key}', [DeviceController::class, 'getActiveTimeSettings']);


Route::get('/check_device_health', [DeviceController::class, 'checkDeviceHealth']);
Route::get('get-device-person-details', [DeviceController::class, 'getDevicePersonDetails']);
Route::get('get-device-settings-from-sdk', [DeviceController::class, 'getDeviceSettingsFromSDK']);
Route::post('update-device-sdk-settings', [DeviceController::class, 'updateDeviceSettingsToSDK']);
Route::post('update-device-alarm-status', [DeviceController::class, 'AlarmOffToDeviceSDK']);
Route::post('update-device-alarm-status-off', [DeviceController::class, 'AlarmOffToDeviceSDK']);







Route::get('get-device-camvii-settings-from-sdk',  [DeviceController::class, 'getDevicecamviiSettingsFromSDK']);
Route::post('update-device-camvii-sdk-settings', [DeviceController::class, 'updateDeviceCamVIISettingsToSDK']);




Route::get('/open_door', [DeviceController::class, 'openDoor']);
Route::get('/close_door', [DeviceController::class, 'closeDoor']);
Route::get('/open_door_always', [DeviceController::class, 'openDoorAlways']);
Route::get('/get_notifications_alarm', [DeviceController::class, 'getAlarmNotification']);


Route::get('/trigger-all-devices-alarm-sdk', [DeviceController::class, 'triggerAllDeviceAlarmSDK']);
Route::post('/download-profilepic-sdk', [DeviceController::class, 'downloadProfilePictureSdk']);
Route::get('/download-profilepic-disk', [DeviceController::class, 'downloadProfilePicture']);
Route::post('/copy-to-profilepic', [DeviceController::class, 'copytoProfilePicture']);
Route::get('/devices-json/{id}', [DeviceController::class, 'devicesJson']);
