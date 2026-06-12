<?php

use App\Http\Controllers\AIFeedsController;
use Illuminate\Support\Facades\Route;

Route::get('ai-feeds', [AIFeedsController::class, 'index']);
Route::get('ai-feeds-weekly-birthdays', [AIFeedsController::class, 'weeklyBirthdays']);
Route::get('ai-feeds/{employee_id}', [AIFeedsController::class, 'aiFeedsByEmployeeId']);
