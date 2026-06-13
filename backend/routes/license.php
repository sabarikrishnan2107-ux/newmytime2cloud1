<?php

use App\Http\Controllers\LicenseController;
use Illuminate\Support\Facades\Route;

// Desktop license generator (master-app admin tool). Mirrors the company routes'
// open style — this is an internal master/admin panel endpoint.
Route::post('licenses/generate', [LicenseController::class, 'generate']);
Route::get('licenses', [LicenseController::class, 'index']);
Route::get('licenses/{id}', [LicenseController::class, 'show']);
Route::delete('licenses/{id}', [LicenseController::class, 'destroy']);
