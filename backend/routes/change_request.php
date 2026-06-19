<?php

use App\Http\Controllers\ChangeRequestController;
use Illuminate\Support\Facades\Route;

Route::apiResource('change_request', ChangeRequestController::class);
Route::post('update-change-request/{id}', [ChangeRequestController::class, "updateChangeRequest"])
    ->middleware("auth:sanctum");
