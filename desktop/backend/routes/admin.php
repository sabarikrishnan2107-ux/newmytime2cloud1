<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AssignModuleController;
use App\Http\Controllers\AssignPermissionController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AttendanceLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommonController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ContactForm\SendMailController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\HolidaysController;
use App\Http\Controllers\ImageController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ResetPasswordController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SdkLogcsvfileController;
use App\Http\Controllers\Shift\MultiInOutShiftController;
use App\Http\Controllers\Shift\SingleShiftController;
use App\Http\Controllers\TradeLicenseController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserLocationController;
use App\Http\Controllers\WhatsappProxyHealthCheckController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;

Route::apiResource('admin', AdminController::class);

// Auth
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/loginwith_otp', [AuthController::class, 'loginwithOTP']);
Route::post('/check_otp/{key}', [AuthController::class, 'verifyOTP']);

Route::post('/employee/login', [EmployeeController::class, 'login']);
Route::get('/employee/me', [EmployeeController::class, 'me'])->middleware('auth:sanctum');

Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
Route::get('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// reset password
Route::post('/reset-password', [ResetPasswordController::class, 'sendCode']);
Route::post('/check-code', [ResetPasswordController::class, 'checkCode']);
Route::post('/new-password', [ResetPasswordController::class, 'newPassword']);

// Assign Permission
Route::post('assign-permission/delete/selected', [AssignPermissionController::class, 'dsr']);
Route::get('assign-permission/search/{key}', [AssignPermissionController::class, 'search']); // search records
Route::get('assign-permission/nars', [AssignPermissionController::class, 'notAssignedRoleIds']);
Route::resource('assign-permission', AssignPermissionController::class);

// User
Route::apiResource('users', UserController::class);
Route::get('users/search/{key}', [UserController::class, 'search']);
Route::post('users/delete/selected', [UserController::class, 'deleteSelected']);

//  Company
Route::get('company/list', [CompanyController::class, 'CompanyList']);

Route::apiResource('company', CompanyController::class)->except('update');
Route::post('company/{id}/update', [CompanyController::class, 'updateCompany']);
Route::post('company/{id}/update/contact', [CompanyController::class, 'updateContact']);
Route::post('company/{id}/update/user', [CompanyController::class, 'updateCompanyUser']);
Route::post('company/{id}/update/user_whatsapp', [CompanyController::class, 'updateCompanyUserWhatsapp']);
Route::post('company/{id}/update/whatsapp_settings', [CompanyController::class, 'updateCompanyWhatsappSettings']);
Route::post('company/{id}/update/modules_settings', [CompanyController::class, 'updateCompanyModulesSettings']);

Route::post('company/{id}/update/geographic', [CompanyController::class, 'updateCompanyGeographic']);
Route::post('company/validate', [CompanyController::class, 'validateCompany']);
Route::post('company/contact/validate', [CompanyController::class, 'validateContact']);
Route::post('company/user/validate', [CompanyController::class, 'validateCompanyUser']);
Route::post('company/update/user/validate', [CompanyController::class, 'validateCompanyUserUpdate']);
Route::get('company/search/{key}', [CompanyController::class, 'search']);
Route::get('company/{id}/branches', [CompanyController::class, 'branches']);
Route::get('company/{id}/devices', [CompanyController::class, 'devices']);
Route::get('UpdateCompanyIds', [CompanyController::class, 'UpdateCompanyIds']);

Route::post('company/{id}/trade-license', [TradeLicenseController::class, 'store']);

//  Permission
Route::apiResource('permission', PermissionController::class);
Route::get('user/{id}/permission', [PermissionController::class, 'permissions']);
Route::get('permission/search/{key}', [PermissionController::class, 'search']);
Route::post('permission/delete/selected', [PermissionController::class, 'deleteSelected']);

// Role
Route::apiResource('role', RoleController::class);
Route::get('user/{id}/role', [RoleController::class, 'roles']);
Route::get('role/search/{key}', [RoleController::class, 'search']);
Route::get('role/permissions/search/{key}', [RoleController::class, 'searchWithRelation']);
Route::get('role/{id}/permissions', [RoleController::class, 'getPermission']);
Route::post('role/{id}/permissions', [RoleController::class, 'assignPermission']);
Route::post('role/delete/selected', [RoleController::class, 'deleteSelected']);
Route::get('role-list', [RoleController::class, 'dropdownList']);
Route::delete('delete-role/{id}', [RoleController::class, 'deleteRole']);

// Branch
// Route::apiResource('branch', BranchController::class)->except('update');
// Route::post('branch/{id}/update', [BranchController::class, 'update']);
// Route::post('branch/{id}/update/contact', [BranchController::class, 'updateContact']);
// Route::post('branch/{id}/update/user', [BranchController::class, 'updateBranchUserUpdate']);
// Route::post('branch/validate', [BranchController::class, 'validateBranch']);
// Route::post('branch/contact/validate', [BranchController::class, 'validateContact']);
// Route::post('branch/user/validate', [BranchController::class, 'validateBranchUser']);
// Route::post('branch/update/user/validate', [BranchController::class, 'validateBranchUserUpdate']);
// Route::get('branch/search/{key}', [BranchController::class, 'search']);

// Module
Route::apiResource('module', ModuleController::class);
Route::get('module/search/{key}', [ModuleController::class, 'search']);
Route::post('module/delete/selected', [ModuleController::class, 'deleteSelected']);

// Assign Permission
Route::post('assign-module/delete/selected', [AssignModuleController::class, 'dsr']);
Route::get('assign-module/search/{key}', [AssignModuleController::class, 'search']);
Route::get('assign-module/nacs', [AssignModuleController::class, 'notAssignedCompanyIds']);
Route::resource('assign-module', AssignModuleController::class);

//Testing Routes for Cron Jobs
Route::get('SyncCompanyIdsWithDevices', [AttendanceLogController::class, 'SyncCompanyIdsWithDevices']);

Route::get('SyncAttendance', [AttendanceController::class, 'SyncAttendance']);

Route::get('ProcessAttendance', [AttendanceController::class, 'ProcessAttendance']);
Route::get('processByManual', [MultiInOutShiftController::class, 'processByManual']);
Route::get('processByManualForSingleShift', [SingleShiftController::class, 'processByManual']);

// Route::get('SyncAbsentForMultipleDays', [AttendanceController::class, 'SyncAbsentForMultipleDays']);
// Route::get('SyncAbsentForMultipleDays', [AttendanceController::class, 'SyncAbsentForMultipleDays']);

Route::get('reset_file/{token}/{file}', [CommonController::class, 'destroy']);

Route::get('downloadfiles', [SdkLogcsvfileController::class, 'list']);
Route::get('download/{key}', [SdkLogcsvfileController::class, 'download']);
Route::get('upcoming-holiday', [HolidaysController::class, 'upcomingHoliday']);

Route::get('/whatsapp/health-check', [WhatsappProxyHealthCheckController::class, 'check']);

Route::get('/progress', function () {
    return response()->json([
        'total'  => Cache::get('batch_total', 0),
        'done'   => Cache::get('batch_done', 0),
        'failed' => Cache::get('batch_failed', 0),
    ]);
});

Route::get('/progress-stream', function () {
    return response()->stream(function () {
        while (true) {
            $data = [
                'total'  => Cache::get('batch_total', 0),
                'done'   => Cache::get('batch_done', 0),
                'failed' => Cache::get('batch_failed', 0),
            ];

            echo "data: " . json_encode($data) . "\n\n";
            ob_flush();
            flush();

            if (connection_aborted()) {
                break;
            }

            sleep(2); // send update every 2s
        }
    }, 200, [
        'Content-Type'  => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'Connection'    => 'keep-alive',
    ]);
});


Route::get('/get-base64', [ImageController::class, 'getBase64Image']);
Route::post('/store-logs-from-nodesdk', [AttendanceLogController::class, 'storeFromNodeSDK']);



use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Models\Attendance;
use Illuminate\Support\Facades\Http;

Route::get('attendance-report', function (Request $request) {

    $request->headers->set('Accept', 'application/json'); // <--- Add this

    Log::channel('custom')->info('Attendance report request', [
        'ip'      => $request->ip(),
        'url'     => $request->fullUrl(),
        'method'  => $request->method(),
        'payload' => $request->all(),
    ]);

    try {

        $validator = Validator::make($request->all(), [
            'company_id' => 'required|integer',
            'date'       => 'required|date_format:Y-m-d',
            'page'       => 'nullable|integer|min:1',
            'per_page'      => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {

            // -----------------------------
            // 🔹 Log Validation Failure
            // -----------------------------
            Log::channel('custom')->warning('Validation failed for attendance report request', [
                'errors' => $validator->errors()->toArray(),
                'payload' => $request->all(),
            ]);

            return response()->json([
                'status'  => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // -----------------------------
        // 🔍 PROCESS MODEL
        // -----------------------------
        $model = (new Attendance)->processAttendanceModel($request);

        $perPage = $request->per_page ?? 1000; // default 50 per page
        $page    = $request->page ?? 1;

        // -----------------------------
        // 📥 PAGINATE
        // -----------------------------
        $model->with([
            'employee:id,first_name,last_name,system_user_id,employee_id,department_id,designation_id',
            'employee.department:id,name',
            'employee.designation:id,name'
        ]);


        $paginated = $model->paginate($perPage, ['id', 'employee_id', 'date', 'ot', 'total_hrs', 'status', 'logs'], 'page', $page);

        // -----------------------------
        // 🔄 RECALCULATE WEEKOFF FOR "A" RECORDS
        // -----------------------------
        $items = collect($paginated->items());
        \App\Services\Attendance\AttendanceWeekOffService::recalculateForReport($items, (int) $request->company_id);

        // -----------------------------
        // 🔄 TRANSFORM DATA
        // -----------------------------
        $data = collect($paginated->items())->map(function ($record, $index) use ($paginated) {

            $logs = $record->logs ?? [];

            $logArray = [];
            foreach (range(1, 7) as $i) {
                $idx = $i - 1;
                $logArray["In{$i}"]  = $logs[$idx]["in"] ?? "---";
                $logArray["Out{$i}"] = $logs[$idx]["out"] ?? "---";
            }

            return [
                // Global row number across pages
                "row_no"      => ($paginated->currentPage() - 1) * $paginated->perPage() + ($index + 1),
                "employee_id" => $record->employee_id,
                "date"        => $record->date,
                "ot"          => $record->ot,
                "total_hrs"   => $record->total_hrs,
                "status"      => $record->status,
                "full_name"   => $record->employee?->full_name,
                "department"  => $record->employee?->department?->name,
                "designation" => $record->employee?->designation?->name,
                "logs"        => $logArray,
            ];
        });

        // -----------------------------
        // 🔹 Log Successful Response
        // -----------------------------
        Log::channel('custom')->info('Attendance report response', [
            'current_page' => $paginated->currentPage(),
            'per_page'     => $paginated->perPage(),
            'total'        => $paginated->total(),
            'last_page'    => $paginated->lastPage(),
            'data_count'   => count($data),
        ]);

        // -----------------------------
        // 📤 RETURN PAGINATED RESPONSE
        // -----------------------------
        return response()->json([
            'status'       => true,
            'current_page' => $paginated->currentPage(),
            'per_page'     => $paginated->perPage(),
            'total'        => $paginated->total(),
            'last_page'    => $paginated->lastPage(),
            'data'         => $data,
        ]);
    } catch (\Exception $e) {

        // -----------------------------
        // 🔹 Log Exception
        // -----------------------------
        Log::channel('custom')->error('Attendance report exception', [
            'message' => $e->getMessage(),
            'trace'   => $e->getTraceAsString(),
        ]);

        return response()->json([
            'status'  => false,
            'message' => 'Something went wrong, please try again later.',
            'error'   => $e->getMessage(),
        ], 500);
    }
})->middleware('auth:sanctum');

Route::post('/logout-api', function (Request $request) {
    $request->user()->currentAccessToken()->delete();
    return response()->json(['message' => 'Logged out']);
})->middleware('auth:sanctum');




Route::get('/test-reverse', function (\Illuminate\Http\Request $request) {
    $lat = $request->query('lat');
    $lon = $request->query('lon');

    if (!$lat || !$lon) {
        return response()->json([
            'error' => 'lat and lon are required'
        ], 400);
    }

    $apiKey = env('GOOGLE_MAPS_KEY'); // Make sure your API key is in .env

    try {
        $url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=$lat,$lon&key=$apiKey&language=en";

        $response = Http::get($url);

        info("STATUS: " . $response->status());
        info("BODY: " . $response->body());

        if (!$response->successful()) {
            return response()->json(['error' => 'Google API request failed'], 500);
        }

        $data = $response->json();

        // No results?
        if (empty($data['results'][0])) {
            info("No address returned");
            return response()->json(['error' => 'No address found'], 404);
        }

        $formatted_address = $data['results'][0]['formatted_address'];

        return $formatted_address;

        return response()->json([
            'address' => $formatted_address
        ]);
    } catch (\Exception $e) {
        info("Exception: " . $e->getMessage());
        return response()->json(['error' => 'Something went wrong'], 500);
    }
});

Route::post('/contact-form', [SendMailController::class, 'send']);

Route::post('/store-notifications', [NotificationsController::class, 'storeNotifications']);

Route::get('/user-locations', [UserLocationController::class, 'index']);