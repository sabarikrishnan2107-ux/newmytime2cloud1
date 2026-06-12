<?php

use App\Http\Controllers\LicenseController;
use Illuminate\Support\Facades\Route;

// Desktop license activation + status. These stay OUTSIDE any license gate so an
// un-activated/expired desktop can still read status and activate a new key.
Route::get('license/status', [LicenseController::class, 'status']);
Route::get('license/fingerprint', [LicenseController::class, 'fingerprint']);
Route::post('license/activate', [LicenseController::class, 'activate']);
