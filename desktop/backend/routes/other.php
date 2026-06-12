<?php

use App\Http\Controllers\ShiftController;
use Illuminate\Support\Facades\Route;

Route::get('/shiftBurkInsert/{id}', [ShiftController::class, 'shiftBurkInsert']);
