<?php

use App\Http\Controllers\ThemeController;
use App\Http\Controllers\WhatsappNotificationsLogController;
use App\Models\WhatsappNotificationsLog;
use Illuminate\Support\Facades\Route;

Route::apiResource('theme', ThemeController::class);
Route::get('theme_count', [ThemeController::class, "theme_count"]);
Route::get('dashbaord_attendance_count', [ThemeController::class, "dashboardCount"]);
Route::get('dashboard_present_employees', [ThemeController::class, "presentEmployees"]);
Route::get('dashboard_absent_employees', [ThemeController::class, "absentEmployees"]);
Route::post('attendance_today_stats_whatsapp', [ThemeController::class, "whatsappTodayStats"]);
Route::get('dashboard_counts_last_7_days', [ThemeController::class, "dashboardGetCountslast7Days"]);
Route::get('dashboard_get_count_department', [ThemeController::class, "dashboardGetCountDepartment"]);
Route::get('previous_week_attendance_count/{id}', [ThemeController::class, "previousWeekAttendanceCount"]);
Route::get('dashboard_Get_Counts_today_multi_general', [ThemeController::class, "dashboardGetCountsTodayMultiGeneral"]);
Route::get('dashboard_get_counts_today_hour_in_out', [ThemeController::class, "dashboardGetCountsTodayHourInOut"]);

Route::get('dashboard_get_visitor_counts_today_hour_in_out', [ThemeController::class, "dashboardGetVisitorCountsTodayHourInOut"]);


Route::post('whatsapp_message_queue', [WhatsappNotificationsLogController::class, "addNewMessage"]);
Route::get('whatsapp_messages_logs', [WhatsappNotificationsLogController::class, "index"]);

Route::get('dashbaord_short_view_count', [ThemeController::class, "dashboardShortViewCount"]);

Route::get('dashboard_counts_last_7_days_chart', [ThemeController::class, "dashboardGetCountslast7DaysChart"]);
