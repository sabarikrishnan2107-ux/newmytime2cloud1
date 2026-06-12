<?php

use App\Http\Controllers\CoordindateController;
use Illuminate\Support\Facades\Route;

Route::get('/coordindates', [CoordindateController::class, 'index']);
Route::post('/coordindates', [CoordindateController::class, 'store']);
