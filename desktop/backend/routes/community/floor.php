<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Community\FloorController;


Route::apiResource('/floor', FloorController::class);

