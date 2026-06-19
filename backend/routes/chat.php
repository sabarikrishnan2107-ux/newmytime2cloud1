<?php

use App\Http\Controllers\ChatController;
use Illuminate\Support\Facades\Route;

Route::get('chat/contacts', [ChatController::class, 'contacts']);
Route::get('chat/messages/{contactId}', [ChatController::class, 'messages']);
Route::post('chat/send', [ChatController::class, 'send']);
Route::get('chat/unread', [ChatController::class, 'unreadCount']);
