<?php

use App\Http\Controllers\PayrollSettingController;
use Illuminate\Support\Facades\Route;

Route::apiResource('payroll_generate_date', PayrollSettingController::class)->only(['index', 'show', 'store','update', 'destroy']);

