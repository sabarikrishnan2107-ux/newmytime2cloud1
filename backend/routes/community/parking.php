<?php

use App\Http\Controllers\Community\ParkingController;
use Illuminate\Support\Facades\Route;

Route::apiResource('parking', ParkingController::class);

