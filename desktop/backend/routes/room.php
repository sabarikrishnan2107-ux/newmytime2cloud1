<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Community\RoomController;
use App\Http\Controllers\Community\RoomCategoryController;


Route::apiResource('/room', RoomController::class);
Route::get('/room_report', [RoomController::class, "report"]);
Route::get('/room_report_print_pdf', [RoomController::class, "print"]);
Route::get('/room_report_download_pdf', [RoomController::class, "download"]);


Route::get('/room-by-floor-id', [RoomController::class, "getRoomsByFloorId"]);
Route::get('/tanents-and-members-by-room-id', [RoomController::class, "getTanentsAndMembersByRoomsId"]);
Route::apiResource('/room-category', RoomCategoryController::class);
