<?php

use App\Http\Controllers\ZoneController;
use Illuminate\Support\Facades\Route;

Route::get('zone_list', [ZoneController::class, "zone_list"]);

Route::put('zone/{id}', [ZoneController::class, "update"]);
Route::apiResource('zone', ZoneController::class);
