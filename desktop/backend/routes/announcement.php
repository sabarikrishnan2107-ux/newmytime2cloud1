<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AnnouncementsCategoriesController;
use Illuminate\Support\Facades\Route;

// announcement
Route::apiResource('announcement', AnnouncementController::class);
Route::get('announcement_list', [AnnouncementController::class, 'annoucement_list']);
Route::get('announcement/search/{key}', [AnnouncementController::class, 'search']);
Route::post('announcement/delete/selected', [AnnouncementController::class, 'deleteSelected']);
Route::get('announcement/employee/{id}', [AnnouncementController::class, 'getAnnouncement']);


//Announce
Route::apiResource('announcements_category', AnnouncementsCategoriesController::class);
