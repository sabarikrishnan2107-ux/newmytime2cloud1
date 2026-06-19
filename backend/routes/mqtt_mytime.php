<?php

use App\Http\Controllers\Mqtt\FaceDeviceController;
use Illuminate\Support\Facades\Route;

Route::prefix('mytimemqtt-device/{deviceId}')->group(function () {

    // 1. Status
    Route::get('/status', [FaceDeviceController::class, 'getStatus']);

    // 2–3. Door
    Route::post('/open-door', [FaceDeviceController::class, 'openDoor']);
    Route::post('/close-door', [FaceDeviceController::class, 'closeDoor']);

    // 4–5. Timezone (app level)
    Route::get('/timezone', [FaceDeviceController::class, 'getTimezone']);
    Route::post('/timezone', [FaceDeviceController::class, 'setTimezone']);

    // 6. Time
    Route::get('/time', [FaceDeviceController::class, 'getTime']);
    Route::post('/time', [FaceDeviceController::class, 'setTime']);

    // 7–8. Person add/edit
    Route::post('/person', [FaceDeviceController::class, 'savePerson']);

    // 9. Batch add
    Route::post('/persons/batch', [FaceDeviceController::class, 'batchSavePersons']);

    // 10. Delete single/batch
    Route::delete('/person/{customId}', [FaceDeviceController::class, 'deletePerson']);
    Route::post('/persons/batch-delete', [FaceDeviceController::class, 'batchDeletePersons']);

    // 11. Search person
    Route::get('/person/{customId}', [FaceDeviceController::class, 'getPerson']);

    // 12. Get all persons
    Route::get('/persons/list', [FaceDeviceController::class, 'getAllPersons']);

    // Optional: search list
    Route::post('/persons/search', [FaceDeviceController::class, 'searchPersonList']);
});
