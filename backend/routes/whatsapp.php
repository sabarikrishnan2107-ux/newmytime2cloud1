<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WhatsappController;

Route::get('/attendance-summary-by-whatsapp', [WhatsappController::class, 'attendanceSummary']);
