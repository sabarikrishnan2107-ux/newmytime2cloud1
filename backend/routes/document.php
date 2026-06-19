<?php

use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentInfoController;
use Illuminate\Support\Facades\Route;

Route::apiResource('document', DocumentController::class);
Route::get('document-upcoming-expiry', [DocumentInfoController::class, 'upcomingExpiry']);
