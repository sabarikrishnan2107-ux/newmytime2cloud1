<?php

use App\Http\Controllers\HostController;
use Illuminate\Support\Facades\Route;

Route::get('host_list', [HostController::class, "host_list"]);

Route::post('host/{id}', [HostController::class, 'update']);

Route::apiResource('host', HostController::class);
