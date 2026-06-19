<?php

use App\Http\Controllers\VisitorManagementController;
use Illuminate\Support\Facades\Route;

// Dashboard
Route::get('visitor-management/dashboard', [VisitorManagementController::class, 'dashboardStats']);
Route::get('visitor-management/analytics', [VisitorManagementController::class, 'dashboardAnalytics']);

// Visitor Logs
Route::get('visitor-management/logs', [VisitorManagementController::class, 'visitorLogs']);

// Directory
Route::get('visitor-management/directory', [VisitorManagementController::class, 'directory']);

// Pre-Registration
Route::get('visitor-management/pre-registrations', [VisitorManagementController::class, 'preRegistrations']);
Route::post('visitor-management/pre-registrations', [VisitorManagementController::class, 'storePreRegistration']);
Route::put('visitor-management/pre-registrations/{id}', [VisitorManagementController::class, 'updatePreRegistration']);
Route::delete('visitor-management/pre-registrations/{id}', [VisitorManagementController::class, 'deletePreRegistration']);

// Blacklist
Route::get('visitor-management/blacklist', [VisitorManagementController::class, 'blacklist']);
Route::post('visitor-management/blacklist', [VisitorManagementController::class, 'storeBlacklist']);
Route::put('visitor-management/blacklist/{id}/remove', [VisitorManagementController::class, 'removeBlacklist']);
Route::post('visitor-management/check-blacklist', [VisitorManagementController::class, 'checkBlacklist']);

// Zones
Route::get('visitor-management/zones', [VisitorManagementController::class, 'zones']);

// Host Employees (for dropdowns)
Route::get('visitor-management/host-employees', [VisitorManagementController::class, 'hostEmployees']);

// Hosts (host_companies — CRUD)
Route::get('visitor-management/hosts', [VisitorManagementController::class, 'hosts']);
Route::post('visitor-management/hosts', [VisitorManagementController::class, 'storeHost']);
Route::put('visitor-management/hosts/{id}', [VisitorManagementController::class, 'updateHost']);
Route::delete('visitor-management/hosts/{id}', [VisitorManagementController::class, 'deleteHost']);
