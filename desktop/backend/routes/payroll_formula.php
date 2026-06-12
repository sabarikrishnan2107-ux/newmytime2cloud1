<?php

use App\Http\Controllers\PayrollFormulaController;
use Illuminate\Support\Facades\Route;

Route::apiResource('payroll_formula', PayrollFormulaController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
