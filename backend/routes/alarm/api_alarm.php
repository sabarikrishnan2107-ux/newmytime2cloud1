<?php

use App\Http\Controllers\Alarm\Api\ApiAlarmControlController;
use App\Http\Controllers\AlarmLogsController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AnnouncementsCategoriesController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// announcement
//Route::apiResource('announcement', AnnouncementController::class);
// Route::get('announcement_list', [AnnouncementController::class, 'annoucement_list']);
// Route::get('announcement/search/{key}', [AnnouncementController::class, 'search']);
//Route::get('alarm_device_status', [ApiAlarmControlController::class, 'LogDeviceStatus']);
//Route::get('announcement/employee/{id}', [AnnouncementController::class, 'getAnnouncement']);
//Route::get('announcement/employee/{id}', [AnnouncementController::class, 'getAnnouncement']);


Route::get('/loadalarm_csv', function (Request $request) {

    return (new AlarmLogsController)->store();
});
