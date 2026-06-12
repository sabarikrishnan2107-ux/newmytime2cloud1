<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Community\CommunityController;

Route::apiResource('/community', CommunityController::class);
Route::delete('/community-delete/{id}', [CommunityController::class,"communityDelete"]);

Route::post('/building/validate', [CommunityController::class,"validateCommunity"]);
Route::post('/community-update/{id}', [CommunityController::class,"communityUpdate"]);
Route::post('/community-update-validate/{id}', [CommunityController::class,"validateUpdateCommunity"]);


