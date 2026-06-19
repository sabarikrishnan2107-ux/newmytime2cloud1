<?php

use App\Http\Controllers\CompanyBranchController;
use Illuminate\Support\Facades\Route;

Route::apiResource('/branch', CompanyBranchController::class);
Route::post('/branch/{id}', [CompanyBranchController::class, "update"]);
Route::get('/branches_list', [CompanyBranchController::class, "branchesList"]);
Route::get('/branch-list', [CompanyBranchController::class, "dropdownList"]);
Route::put('/branch-update-geofencing/{id}', [CompanyBranchController::class, "updateGeoFencing"]);
Route::get('/branch-list-for-geofencing/{id}', [CompanyBranchController::class, "branchListGeoFencing"]);

Route::get('/reverse-geocode-country', function (\Illuminate\Http\Request $request) {
    $lat = $request->get('lat');
    $lon = $request->get('lon');
    if (!$lat || !$lon) {
        return response()->json(['country_code' => null]);
    }
    $service = new \App\Services\ReverseGeocodeService();
    $country = $service->getCountryCode($lat, $lon);
    return response()->json(['country_code' => $country]);
});
