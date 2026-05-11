<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\AlarmLogsController;
use App\Http\Controllers\AllowanceController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AssignPermissionController;
use App\Http\Controllers\AttendanceLogController;
use App\Http\Controllers\AutoShiftController;
use App\Http\Controllers\BankInfoController;
use App\Http\Controllers\CommissionController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\CountController;
use App\Http\Controllers\DeductionController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DesignationController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\DeviceNotificationsController;
use App\Http\Controllers\DeviceNotificationsLogController;
use App\Http\Controllers\DocumentInfoController;
use App\Http\Controllers\DutyOrganizerController;
use App\Http\Controllers\EmiratesController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EmployeeLeaveDocumentController;
use App\Http\Controllers\EmployeeLeavesController;
use App\Http\Controllers\ExperienceController;
use App\Http\Controllers\GlobalSearchController;
use App\Http\Controllers\GovernmentHolidaysController;
use App\Http\Controllers\HolidaysController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\LeaveCountController;
use App\Http\Controllers\LeaveGroupsController;
use App\Http\Controllers\LeaveTypesController;
use App\Http\Controllers\MailContentController;
use App\Http\Controllers\OvertimeController;
use App\Http\Controllers\PassportController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\PersonalInfoController;
use App\Http\Controllers\policyController;
use App\Http\Controllers\QualificationController;
use App\Http\Controllers\RegisterController;
use App\Http\Controllers\ReportNotificationController;
use App\Http\Controllers\ReportNotificationLogsController;
use App\Http\Controllers\Reports\AutoReportController;
use App\Http\Controllers\Reports\ManualReportController;
use App\Http\Controllers\ResetPasswordController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\RosterController;
use App\Http\Controllers\SalaryController;
use App\Http\Controllers\SalaryTypeController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\ShiftTypeController;
use App\Http\Controllers\SubDepartmentController;
use App\Http\Controllers\TimeTableController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VisaController;
use App\Http\Controllers\WhatsappNotificationsLogController;
use App\Models\DeviceNotifications;
use App\Models\ReportNotificationLogs;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

Route::post('/get-company-id-by-device', [DeviceController::class, 'get_company_id_by_device']);


Route::get('/master_dashboard', [CompanyController::class, 'getMasterDashboardCounts']);

// employee reporter
Route::post('/employee_to_reporter/{id}', [EmployeeController::class, 'employeeToReporter']);
Route::get('/employee_reporters', [EmployeeController::class, 'employeeReporters']);
Route::delete('/employee_remove_reporters/{id}', [EmployeeController::class, 'employeeRemoveReporter']);
Route::get('/reporter_by_employee/{id}', [EmployeeController::class, 'getReporterByEmployee']);

// reset password
Route::post('/reset-password', [ResetPasswordController::class, 'sendCode']);
Route::post('/check-code', [ResetPasswordController::class, 'checkCode']);
Route::post('/new-password', [ResetPasswordController::class, 'newPassword']);

// Assign Permission
Route::get('dropDownList', [PermissionController::class, 'dropDownList']);
Route::post('assign-permission/delete/selected', [AssignPermissionController::class, 'dsr']);
Route::get('assign-permission/search/{key}', [AssignPermissionController::class, 'search']); // search records
Route::get('assign-permission/nars', [AssignPermissionController::class, 'notAssignedRoleIds']);
Route::resource('assign-permission', AssignPermissionController::class);
Route::get('assign-permission/role-id/{key}', [AssignPermissionController::class, 'assignPermissionsByRoleid']);

// User
Route::apiResource('users', UserController::class);
Route::get('users/search/{key}', [UserController::class, 'search']);
Route::post('users/delete/selected', [UserController::class, 'deleteSelected']);

// Department
Route::apiResource('departments', DepartmentController::class);
Route::get('department-list', [DepartmentController::class, 'dropdownList']);
Route::get('departments/search/{key}', [DepartmentController::class, 'search']);
Route::post('departments/delete/selected', [DepartmentController::class, 'deleteSelected']);

// Sub Department
Route::apiResource('sub-departments', SubDepartmentController::class);
Route::post('sub-departments/delete/selected', [SubDepartmentController::class, 'deleteSelected']);
Route::get('sub-departments-by-department', [SubDepartmentController::class, 'sub_departments_by_department']);
Route::get('sub-departments-by-departments', [SubDepartmentController::class, 'sub_departments_by_departments']);

// Schedule
Route::apiResource('schedule', ScheduleController::class);
Route::get('schedule/search/{key}', [ScheduleController::class, 'search']);
Route::post('schedule/delete/selected', [ScheduleController::class, 'deleteSelected']);

// Designation
Route::apiResource('designation', DesignationController::class);
Route::get('designations-by-department', [DesignationController::class, 'designations_by_department']);
Route::get('designation/search/{key}', [DesignationController::class, 'search']);
Route::post('designation/delete/selected', [DesignationController::class, 'deleteSelected']);
Route::get('designation-list', [DesignationController::class, 'dropdownList']);


// Role
Route::apiResource('role', RoleController::class);
Route::get('user/{id}/role', [RoleController::class, 'roles']);
Route::get('role/search/{key}', [RoleController::class, 'search']);
Route::get('role/permissions/search/{key}', [RoleController::class, 'searchWithRelation']);
Route::get('role/{id}/permissions', [RoleController::class, 'getPermission']);
Route::post('role/{id}/permissions', [RoleController::class, 'assignPermission']);
Route::post('role/delete/selected', [RoleController::class, 'deleteSelected']);

// AttendanceLogs
Route::apiResource('attendance_logs', AttendanceLogController::class);
Route::get('get_last_ten_attendance_logs', [AttendanceLogController::class, 'getLastTenLogs']);
Route::get('get_logs_count', [AttendanceLogController::class, 'getLogsCount']);
Route::get('attendance_logs/{key}/daily',);
Route::get('attendance_logs/{key}/monthly', [AttendanceLogController::class, 'AttendanceLogsMonthly']);
Route::post('generate_manual_log', [AttendanceLogController::class, 'GenerateManualLog']);
Route::get('attendance_logs/search/{company_id}', [AttendanceLogController::class, 'search']);
Route::get('attendance_logs/{id}/search/{key}', [AttendanceLogController::class, 'AttendanceLogsSearch']);
Route::get('attendance_log_paginate/{page?}', [AttendanceLogController::class, 'AttendanceLogPaginate']);

//Route::post('generate_logs111111', [AttendanceLogController::class, 'generate_logs']);
Route::post('generate_log', [AttendanceLogController::class, 'GenerateLog'])->middleware("auth:sanctum");
Route::get('logs', [AttendanceLogController::class, 'getAttendanceLogs']);

Route::get('attendance_single_list', [AttendanceLogController::class, 'singleView']);
Route::get('attendance_single_list_by_id', [AttendanceLogController::class, 'singleViewById']);

// policy
Route::apiResource('policy', policyController::class);
Route::get('policy/search/{key}', [policyController::class, 'search']);
Route::post('policy/delete/selected', [policyController::class, 'deleteSelected']);

//mail content
Route::apiResource('mail_content', MailContentController::class);

// activities
Route::apiResource('activity', ActivityController::class);
Route::get('activitiesByUser/{user_id}', [ActivityController::class, "activitiesByUser"]);

// -----------------------Company App-------------------------------

// Company Auth

Route::post('no-shift-employees/delete/selected', [DutyOrganizerController::class, 'deleteSelected']);
Route::get('no-shift-employees/search/{key}', [DutyOrganizerController::class, 'search']);

Route::apiResource('no-shift-employees', DutyOrganizerController::class);

Route::apiResource('alarm_logs', AlarmLogsController::class);


//  Employee
Route::get('employeev1', [EmployeeController::class, "indexV1"]);
Route::post('global-search', [GlobalSearchController::class, "globalSearch"]);

// Bulk import/export — must be declared BEFORE apiResource('employee') so they
// are not shadowed by the GET /employee/{id} show route.
Route::get('employee/sample-template', [EmployeeController::class, 'downloadSample']);
Route::get('employee/export', [EmployeeController::class, 'exportEmployees']);

Route::apiResource('employee', EmployeeController::class);


Route::get('employeesList', [EmployeeController::class, 'employeesList']);
Route::get('document_expiry', [EmployeeController::class, 'document_expiry']);
Route::get('employee-list', [EmployeeController::class, 'dropdownList']);
Route::get('employeesByDepartment', [EmployeeController::class, 'employeesByDepartment']);
Route::get('employeesByDepartmentForAnnoucements', [EmployeeController::class, "employeesByDepartmentForAnnoucements"]);
Route::get('employeesBySubDepartment', [EmployeeController::class, 'employeesBySubDepartment']);
Route::get('employeesByEmployeeId', [EmployeeController::class, 'employeesByEmployeeId']);
Route::get('employeesByDesignation/{key}', [EmployeeController::class, 'employeesByDesignation']);
Route::get('designationsByDepartment/{key}', [EmployeeController::class, 'designationsByDepartment']);

Route::get('attendance_employees', [EmployeeController::class, 'attendance_employees']);

Route::post('employee/validate', [EmployeeController::class, 'validateEmployee']);
Route::post('employee/contact/validate', [EmployeeController::class, 'validateContact']);
Route::post('employee/other/validate', [EmployeeController::class, 'validateOther']);
Route::post('employee/{id}/update', [EmployeeController::class, 'updateEmployee']);
Route::post('employee/{id}/update/contact', [EmployeeController::class, 'updateContact']);
Route::post('employee/{id}/update/other', [EmployeeController::class, 'updateOther']);
Route::get('employee/search/{key}', [EmployeeController::class, 'search']);
Route::get('employee/searchby_emp_table_salary/{key}', [EmployeeController::class, 'searchby_emp_table_salary']);

Route::post('employee/import', [EmployeeController::class, 'import']);

Route::resource('personalinfo', PersonalInfoController::class);
Route::resource('bankinfo', BankInfoController::class);
Route::resource('documentinfo', DocumentInfoController::class);
Route::resource('experience', ExperienceController::class);
Route::resource('qualification', QualificationController::class);
Route::resource('passport', PassportController::class);
Route::resource('visa', VisaController::class);
Route::resource('emirate', EmiratesController::class);

Route::post('employee/update/contact', [EmployeeController::class, 'employeeContactUpdate']);
Route::post('employee/update/setting', [EmployeeController::class, 'employeeUpdateSetting']);

//Route::post('employee/devicestimezone', [EmployeeController::class, 'employeeUpdateDevicestimezone']);

// Salary Type
Route::apiResource('salary_type', SalaryTypeController::class);
Route::get('salary_type/search/{key}', [SalaryTypeController::class, 'search']);
Route::post('salary_type/delete/selected', [SalaryTypeController::class, 'deleteSelected']);

// Salary
Route::apiResource('salary', SalaryController::class);

// Deduction
Route::apiResource('deduction', DeductionController::class);

// Overtime
Route::apiResource('overtime', OvertimeController::class);

// Allowance
Route::apiResource('allowance', AllowanceController::class);

// Commission
Route::apiResource('commission', CommissionController::class);

Route::get('/count', CountController::class);

// dev started

Route::apiResource('shift', ShiftController::class);
Route::get('shift_dropdownlist', [ShiftController::class, 'shiftDropdownlist']);

Route::get('get_shift', [ShiftController::class, 'getShift']);
Route::post('update_single_shift', [ShiftController::class, 'updateSingleShift']);
Route::get('shift_by_type', [ShiftController::class, 'shift_by_type']);
Route::get('shift_by_types', [ShiftController::class, 'shift_by_types']);
Route::get('list_with_out_multi_in_out', [ShiftController::class, 'list_with_out_multi_in_out']);

//Route::apiResource('time_table', TimeTableController::class);

Route::apiResource('shift_type', ShiftTypeController::class);

// Route::get('custom_report', [ReportController::class, 'custom_report']);

// Route::get('manual_report', [ManualReportController::class, 'custom_report']);
// Route::post('manual_report', [ManualReportController::class, 'store']);
// Route::get('auto_report', [AutoReportController::class, 'custom_report']);
// Route::post('auto_report', [AutoReportController::class, 'store']);
// Route::get('SyncDefaultAttendance', [AutoReportController::class, 'SyncDefaultAttendance']);

// Route::get('no_report', [ReportController::class, 'no_report']);
// Route::get('overnight_report', [ReportController::class, 'overnight_report']);
// Route::get('odd_even_report', [ReportController::class, 'odd_even_report']);

Route::get('attendance_logs_details', [AttendanceLogController::class, 'AttendanceLogsDetails']);

// -----------------------Employee App-------------------------------

//leave
Route::apiResource('leave', LeaveController::class);
Route::post('leave/delete/selected', [LeaveController::class, 'deleteSelected']);
Route::get('/leave-notification/{id}', [LeaveController::class, 'geLeaveNotification']);
Route::post('/leave-status', [LeaveController::class, 'status']);

Route::get('leave-notification/search/{key}/{id}', [LeaveController::class, 'searchNotification']); // search records
Route::get('leave/search/{key}', [LeaveController::class, 'search']); // search records

Route::post('report_notifications', function (Request $request) {
    return $request->all();
});

Route::apiResource('report_notification', ReportNotificationController::class);
Route::apiResource('report_notification_logs', ReportNotificationLogsController::class);

Route::apiResource('device_notifications', DeviceNotificationsController::class);
Route::apiResource('device_notifications_logs', DeviceNotificationsLogController::class);
Route::get('testmail', [ReportNotificationController::class, 'testmail']);
// Route::get('/auto_shift', [AutoShiftController::class, 'index']);
// Route::post('/auto_shift', [AutoShiftController::class, 'store']);
Route::apiResource('roster', RosterController::class);
Route::get('/roster_list', [RosterController::class, 'getRosterList']);
Route::post('/store_schedule_arrange', [RosterController::class, 'storeScheduleArrange']);
Route::put('/schedule_update/{id}', [RosterController::class, 'scheduleUpdateByEmployee']);

// Holidays
Route::apiResource('holidays', HolidaysController::class);
Route::get('government-holidays', [GovernmentHolidaysController::class, 'index']);
Route::get('government-holidays/countries', [GovernmentHolidaysController::class, 'countries']);
Route::get('employee/{id}/government-holidays', [GovernmentHolidaysController::class, 'employeeHolidays']);
Route::post('employee/{id}/government-holidays', [GovernmentHolidaysController::class, 'saveEmployeeHolidays']);
Route::delete('employee/{id}/government-holidays', [GovernmentHolidaysController::class, 'resetEmployeeHolidays']);
Route::get('employees/government-holidays-status', [GovernmentHolidaysController::class, 'employeesCustomStatus']);

// Auto Regenerate Settings
Route::get('auto-regenerate', [\App\Http\Controllers\AutoRegenerateController::class, 'index']);
Route::post('auto-regenerate', [\App\Http\Controllers\AutoRegenerateController::class, 'store']);
Route::put('auto-regenerate/{id}', [\App\Http\Controllers\AutoRegenerateController::class, 'update']);
Route::delete('auto-regenerate/{id}', [\App\Http\Controllers\AutoRegenerateController::class, 'destroy']);
Route::post('auto-regenerate/{id}/toggle', [\App\Http\Controllers\AutoRegenerateController::class, 'toggleActive']);

//Route::get('holidays', [HolidaysController::class, 'list']);
// Route::get('holidays/search/{key}', [HolidaysController::class, 'search']);
// Route::post('holidays/delete/selected', [HolidaysController::class, 'deleteSelected']);

// Leaves
Route::apiResource('employee_leaves', EmployeeLeavesController::class);
Route::post('employee_leaves/approve/{id}', [EmployeeLeavesController::class, 'approveLeave']);
Route::get('employee_leaves/reject/{id}', [EmployeeLeavesController::class, 'rejectLeave']);
Route::get('employee_leaves_new', [EmployeeLeavesController::class, 'newNotifications']);
Route::get('employee_leaves_new_by_employee', [EmployeeLeavesController::class, 'newEmployeeNotifications']);

Route::get('employee_leaves_events', [EmployeeLeavesController::class, 'getEvents']);
Route::get('employee_leaves_for_next_thirty_days_month', [EmployeeLeavesController::class, 'getLeavesForNextThirtyDaysMonth']);


Route::apiResource('employee_document', EmployeeLeaveDocumentController::class);

//Leave Type
Route::apiResource('leave_type', LeaveTypesController::class);



Route::apiResource('leave_count', LeaveCountController::class);

Route::apiResource('leave_groups', LeaveGroupsController::class);
Route::get('leave_groups/{id}', [LeaveGroupsController::class, 'show']);
Route::get('leave-group-list', [LeaveGroupsController::class, 'dropdownList']);

Route::get('leave_total_quota/{id}', [LeaveGroupsController::class, 'totalLeaveQuota']);
Route::get('yearly_leave_quota/{id}', [LeaveGroupsController::class, 'yearlyLeaveQuota']);

Route::post('register', [RegisterController::class, 'store']);

Route::post('send-whatsapp-wessage', function (Request $request) {
    return (new WhatsappNotificationsLogController())->addMessage($request->company_id, $request->mobile_number, $request->message);
});

Route::get('company-short-info/{id}', [CompanyController::class, 'shortInfo']);
Route::get('get-company-contact-info/{url}', [CompanyController::class, 'contactInfo']);




Route::get('company/{id}/wizard-mode', [CompanyController::class, 'getWizardMode']);
Route::post('company/{id}/wizard-mode', [CompanyController::class, 'setWizardMode']);

Route::get('check-pin', [CompanyController::class, 'checkPin']);
Route::post('update-logo-only', [CompanyController::class, 'updateLogoOnly']);
Route::get('get-logo-only/{id}', [CompanyController::class, 'getLogoOnly']);



