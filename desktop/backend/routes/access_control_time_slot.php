<?php

use App\Http\Controllers\AccessControlTimeSlotController;
use Illuminate\Support\Facades\Route;

Route::apiResource('/access-control-time-slot', AccessControlTimeSlotController::class);
