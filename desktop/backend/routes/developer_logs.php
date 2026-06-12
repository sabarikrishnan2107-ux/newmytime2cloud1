<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Route;

Route::get('/log-view', function () {

    // https://backend.mytime2cloud.com/api/log-view?url=app/logs/whatsapp/22/2025-03-08/17:13.log&app_key=base64:o0274u36dsx5sXvLe4R5XPHPLqFoUr7TMuV5z9lQEy0=
    $app_key = request("app_key");

    if ($app_key != env("APP_KEY")) {
        return response()->json(['message' => 'Invalid Key'], 400);
    }

    $url = request("url"); 

    $path = storage_path($url);

    if (!File::exists($path)) {
        return response()->json(['message' => 'Log file not found'], 404);
    }

    return Response::make(nl2br(File::get($path)), 200);
});
