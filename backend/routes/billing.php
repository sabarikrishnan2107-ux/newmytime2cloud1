<?php

use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\QuotationController;
use Illuminate\Support\Facades\Route;

// Master-portal billing/CRM endpoints (Phase 2). Open "internal admin panel"
// style, mirroring the company/license routes.

// Products (catalog)
Route::get('products', [ProductController::class, 'index']);
Route::post('products', [ProductController::class, 'store']);
Route::get('products/{id}', [ProductController::class, 'show']);
Route::put('products/{id}', [ProductController::class, 'update']);
Route::delete('products/{id}', [ProductController::class, 'destroy']);

// Invoices (+ line items)
Route::get('invoices', [InvoiceController::class, 'index']);
Route::post('invoices', [InvoiceController::class, 'store']);
Route::get('invoices/{id}', [InvoiceController::class, 'show']);
Route::put('invoices/{id}', [InvoiceController::class, 'update']);
Route::delete('invoices/{id}', [InvoiceController::class, 'destroy']);

// Quotations (+ line items, convert to invoice)
Route::get('quotations', [QuotationController::class, 'index']);
Route::post('quotations', [QuotationController::class, 'store']);
Route::get('quotations/{id}', [QuotationController::class, 'show']);
Route::put('quotations/{id}', [QuotationController::class, 'update']);
Route::delete('quotations/{id}', [QuotationController::class, 'destroy']);
Route::post('quotations/{id}/convert', [QuotationController::class, 'convert']);

// Payments
Route::get('payments', [PaymentController::class, 'index']);
Route::post('payments', [PaymentController::class, 'store']);
Route::get('payments/{id}', [PaymentController::class, 'show']);
Route::delete('payments/{id}', [PaymentController::class, 'destroy']);

// Plans (subscription tiers)
Route::get('plans', [PlanController::class, 'index']);
Route::post('plans', [PlanController::class, 'store']);
Route::get('plans/{id}', [PlanController::class, 'show']);
Route::put('plans/{id}', [PlanController::class, 'update']);
Route::delete('plans/{id}', [PlanController::class, 'destroy']);
