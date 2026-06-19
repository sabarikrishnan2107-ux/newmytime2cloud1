<?php

use App\Http\Controllers\VisitorLogController;
use Illuminate\Support\Facades\Route;

Route::apiResource('visitor_logs', VisitorLogController::class);
