<?php

use App\Http\Controllers\PurposeController;
use Illuminate\Support\Facades\Route;

// whatsapp
Route::apiResource('purpose', PurposeController::class);
Route::get('purpose_list', [PurposeController::class, "purposeList"]);
