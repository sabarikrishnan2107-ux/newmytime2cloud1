<?php

use App\Http\Controllers\BranchGroupLoginController;
use App\Http\Controllers\DepartmentGroupLoginController;
use Illuminate\Support\Facades\Route;

Route::apiResource('branch-group-login', BranchGroupLoginController::class);
Route::apiResource('department-group-login', DepartmentGroupLoginController::class);