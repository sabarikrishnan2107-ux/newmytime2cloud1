<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FaqController;

Route::get('faqs', [FaqController::class, 'index']);
Route::get('faqs-list', [FaqController::class, 'FAQList']);
Route::post('faqs', [FaqController::class, 'store']);
Route::put('faqs/{id}', [FaqController::class, 'update']);
Route::delete('faqs/{id}', [FaqController::class, 'destroy']);