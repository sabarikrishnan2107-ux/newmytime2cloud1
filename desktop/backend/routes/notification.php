<?php

use App\Http\Controllers\NotificationsController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WhatsappController;


// whatsapp
Route::post('/late_employee_notification', [WhatsappController::class, 'SendNotification']);



Route::get('/notifications', [NotificationsController::class, 'index']);
Route::get('/unread', [NotificationsController::class, 'unread']);
Route::get('/read', [NotificationsController::class, 'read']);
Route::put('/update/{id}', [NotificationsController::class, 'update']);
