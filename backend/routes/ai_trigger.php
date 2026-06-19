<?php

use Illuminate\Support\Facades\Route;


use App\Http\Controllers\AITriggerController;

Route::post('/ai-triggers', [AITriggerController::class,'store']);
Route::get('/ai-triggers', [AITriggerController::class,'index']);
Route::delete('/ai-triggers/{id}', [AITriggerController::class,'destroy']);