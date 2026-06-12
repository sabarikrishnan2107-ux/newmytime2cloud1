<?php

use App\Http\Controllers\ManagerLoginController;
use Illuminate\Support\Facades\Route;

Route::apiResource('manager-login', ManagerLoginController::class);