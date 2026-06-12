<?php

use App\Http\Controllers\Community\MemberController;
use Illuminate\Support\Facades\Route;

Route::get('members/{id}', [MemberController::class, "memberList"]);
Route::post('members/{id}', [MemberController::class, "store"]);
Route::delete('members/{id}', [MemberController::class, "destroy"]);
Route::post('/members-update/{id}', [MemberController::class,"memberUpdate"]);
Route::get('get_member_types', [MemberController::class, "get_member_types"]);

