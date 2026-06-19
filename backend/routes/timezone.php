<?php

use App\Http\Controllers\TimezoneController;
use Illuminate\Support\Facades\Route;

Route::apiResource('timezone', TimezoneController::class);

Route::post('getTimezoneJson', [TimezoneController::class, 'getTimezoneJson']);
Route::post('storeTimezoneDefaultJson', [TimezoneController::class, 'storeTimezoneDefaultJson']);
Route::get('GetTimezoneDefaultJson', [TimezoneController::class, 'GetTimezoneDefaultJson']);
Route::get('timezone/search/{key}', [TimezoneController::class, 'search']);
Route::get('timezone_list', [TimezoneController::class, 'timezonesList']);
Route::get('timezone-list', [TimezoneController::class, 'dropdownList']);
Route::post('create_default_timezones', [TimezoneController::class, 'createDefaultFullNoTimezones']);
