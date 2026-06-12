<?php

use App\Http\Controllers\Community\DashboardController;

use Illuminate\Support\Facades\Route;

Route::apiResource('theme', DashboardController::class);
Route::get('theme_count', [DashboardController::class, "theme_count"]);
Route::get('community_dashbaord_attendance_count', [DashboardController::class, "dashboardCount"]);
Route::get('community_dashboard_counts_last_7_days', [DashboardController::class, "dashboardGetCountslast7Days"]);
Route::get('community_dashboard_get_count_department', [DashboardController::class, "dashboardGetCountDepartment"]);
Route::get('community_previous_week_attendance_count/{id}', [DashboardController::class, "previousWeekAttendanceCount"]);
Route::get('community_dashboard_Get_Counts_today_multi_general', [DashboardController::class, "dashboardGetCountsTodayMultiGeneral"]);
Route::get('community_dashboard_get_counts_today_hour_in_out', [DashboardController::class, "dashboardGetCountsTodayHourInOut"]);
Route::get('community_dashboard_get_today_statistics', [DashboardController::class, "dashboardGetCountsTodayStatistics"]);
Route::get('community_dashboard_get_assets_statistics', [DashboardController::class, "dashboardGetAssetsStatistics"]);
Route::get('community_announcement_list', [DashboardController::class, "dashboardAnnouncementList"]);
Route::get('community_dashboard_get_male_female_count', [DashboardController::class, "dashboardMaleFemaleCount"]);








Route::get('community_dashboard_get_visitor_counts_today_hour_in_out', [DashboardController::class, "dashboardGetVisitorCountsTodayHourInOut"]);
