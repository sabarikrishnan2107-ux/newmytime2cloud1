<?php

use App\Http\Controllers\ClockingController;
use Illuminate\Support\Facades\Route;

Route::apiResource('clocking', ClockingController::class);
Route::post('update-clocking/{id}', [ClockingController::class, "updateClocking"]);
