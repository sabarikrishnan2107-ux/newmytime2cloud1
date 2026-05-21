<?php

use App\Http\Controllers\Dashboards\EmployeeDashboard;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\EmployeeAccessController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EmployeeControllerNew;
use App\Http\Controllers\EmployeeDeviceEnrollmentController;
use Illuminate\Support\Facades\Route;

Route::get('/employee-statistics', [EmployeeDashboard::class, 'statistics']);
Route::get('/staff-stats', [\App\Http\Controllers\StaffStatsController::class, 'stats']);
Route::get('/staff-monthly-trend', [\App\Http\Controllers\StaffStatsController::class, 'monthlyTrend']);
Route::get('/clear-attendance-cache', [EmployeeDashboard::class, 'clearEmployeeCache']);

Route::post('employee-store', [EmployeeController::class, 'employeeStore']);
Route::get('employee-single/{id}', [EmployeeController::class, 'employeeSingle']);
Route::post('employee-update/{id}', [EmployeeController::class, 'employeeUpdate']);
Route::post('employee-login-update/{id}', [EmployeeController::class, 'employeeLoginUpdate']);
Route::post('employee-rfid-update/{id}', [EmployeeController::class, 'employeeRFIDUpdate']);

Route::get('employee-announcements/{id}', [EmployeeController::class, 'employeeAnnouncements']);
Route::get('employee-today-announcements/{id}', [EmployeeController::class, 'employeeTodayAnnouncements']);

Route::get('department-employee', [DepartmentController::class, 'departmentEmployee']);
Route::get('download-emp-pic/{id}/{name}', [EmployeeController::class, 'downloadEmployeePic']);
Route::get('download-emp-documents/{id}/{file_name}', [EmployeeController::class, 'downloadEmployeeDocuments']);
Route::get('download-employee-profile-pdf/{id}', [EmployeeController::class, 'downloadEmployeeProfilepdf']);
Route::get('download-employee-profile-pdf-view/{id}', [EmployeeController::class, 'downloadEmployeeProfilepdfView']);

Route::get('/donwload_storage_file', [EmployeeController::class, 'donwnloadStorageFile']);

Route::get('default-attendance-missing', [EmployeeController::class, 'defaultAttendanceForMissing']);
Route::get('default-attendance-missing-schedule-ids', [EmployeeController::class, 'defaultAttendanceForMissingScheduleIds']);

Route::post('delete-employee-from-device', [EmployeeController::class, 'deleteEmployeeFromDevice']);

Route::get('get-employee-device-details', [DeviceController::class, 'getDevicePersonDetails']);

Route::post('employee-store-from-device', [EmployeeController::class, 'employeeStoreFromDevice']);
Route::post('employee-update-from-device/{id}', [EmployeeController::class, 'employeeUpdateFromDevice']);

Route::get('get-encoded-profile-picture/{url?}', [EmployeeController::class, 'getEncodedProfilePicture']);

Route::get('employee-attendance-summary', [EmployeeController::class, 'attendanceSummary']);
Route::get('employee-avg-clock-in', [EmployeeController::class, 'avgClockIn']);

Route::post('employee-store-new', [EmployeeControllerNew::class, 'storeNew']);
Route::post('employee-update-profile-picture', [EmployeeControllerNew::class, 'updateProfilePicture']);
Route::post('employee-update-new/{id}', [EmployeeControllerNew::class, 'updateNew']);
Route::post('employee-update-address-new/{id}', [EmployeeControllerNew::class, 'updateAddress']);
Route::post('employee-update-qualification-new/{id}', [EmployeeControllerNew::class, 'updateQualification']);
Route::post('employee-update-bank-new', [EmployeeControllerNew::class, 'updateBank']);

Route::post('employee-update-document-new', [EmployeeControllerNew::class, 'updateDocument']);

Route::get('/access-employees', [EmployeeAccessController::class, 'index']);
Route::post('/check-user-code', [EmployeeAccessController::class, 'checkUserCode']);
Route::get('/get-employees-by-department-ids', [EmployeeController::class, 'getEmployeesByDepartmentIds']);


Route::put('/employees/{id}/contact-update', [EmployeeControllerNew::class, 'updateContactDetails']);

Route::post('leave-group-and-report-manager-update/{id}', [EmployeeControllerNew::class, 'leaveGroupAndReportManagerUpdate']);
Route::post('employee-update-general-settings/{id?}', [EmployeeControllerNew::class, 'updateGeneralSettings']);
Route::post('employee-update-access-settings-new/{id}', [EmployeeControllerNew::class, 'updateAccessSettings']);
Route::post('employee-update-password/{id}', [EmployeeControllerNew::class, 'updatePassword']);
Route::post('employee-update-login-new/{id}', [EmployeeControllerNew::class, 'updateLogin']);

Route::get('employee-details/{id}', [EmployeeControllerNew::class, 'show']);
Route::get('employees-json/{id}', [EmployeeControllerNew::class, 'employeesJson']);

Route::get('/employee-ai-related-info/{id}', [EmployeeControllerNew::class, 'employeeAiRelatedInfo']);

Route::get('employees/{employeeId}/enrolled-devices', [EmployeeDeviceEnrollmentController::class, 'index']);
Route::delete('employees/{employeeId}/enrolled-devices/{deviceId}', [EmployeeDeviceEnrollmentController::class, 'destroy']);
