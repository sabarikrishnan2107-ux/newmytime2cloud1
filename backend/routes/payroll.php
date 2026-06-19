<?php

use App\Http\Controllers\PayrollController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


// whatsapp
Route::post('/payroll', [PayrollController::class, 'store']);
Route::get('/payroll/{id}', [PayrollController::class, 'show']);

Route::get('/donwload_payslip', function (Request $request) {


    $filePath = storage_path('app/payslips/' . $request->file_name);

    // Check if the file exists
    if (file_exists($filePath)) {
        // Create a response to download the file
        return response()->download($filePath, 'myfile.pdf');
    } else {
    }
});
