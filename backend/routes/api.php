<?php
// Mobile app routes must register before company.php, because company.php defines
// Route::apiResource('employee', ...) which greedily matches GET /employee/{id}
// and would swallow /employee/location-log, treating "location-log" as an id.
include('realtime_location.php');
include('admin.php');
include('company.php');
include('pdf.php');
include('sdk.php');
include('notification.php');
include('payroll.php');
include('payroll_formula.php');
include('payroll_setting.php');
include('payslip.php');
include('timezone.php');
include('employee_timezone_mapping.php');
include('document.php');
include('employee.php');
include('schedule_employee.php');
include('test.php');
include('cron.php');
include('render_report.php');
include 'purpose.php';
include('status.php');
include('host.php');
include('visitor.php');
include('visitor_logs.php');
include('visitor_attendance.php');
include('zone.php');
include('theme.php');
include('announcement.php');
include('assigned_department_employee.php');
include('attendance.php');
include('branch.php');
include('whatsapp.php');
include('access_control_time_slot.php');
include('devices.php');
include('camera-stream.php');
include('chat.php');
include('payroll_management.php');
include('visitor_management.php');
include('clocking.php');
include('change_request.php');

include('community/room.php');
include('community/floor.php');
include('community/tanent.php');
include('community/member.php');
include('community/community.php');
include('community/report.php');
include('community/dashboard.php');
include('community/parking.php');

include('csv.php');
include('other.php');
include('camera2.php');
include('client_support_api.php');
include('alarm/api_alarm.php');

include('faqs.php');
include('whatsapp_clients.php');

include('developer_logs.php');
include('group.php');
include('group.php');


include('mqtt_mytime.php');
include('coordinates.php');
include('manager-login.php');
include('ai_feeds.php');

include('ai_trigger.php');

include('reports_monthly_pdf.php');
include('license.php');
// Voice assistant (Grok) command interpreter
Route::post('/voice/interpret', [\App\Http\Controllers\VoiceAssistantController::class, 'interpret']);
