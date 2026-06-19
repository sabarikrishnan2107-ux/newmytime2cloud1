<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Services\AbsentReportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AbsentReportController extends Controller
{
    public function __construct(private AbsentReportService $service) {}

    public function data(Request $request): JsonResponse
    {
        $request->validate([
            'mode' => 'required|in:daily,monthly',
            'from_date' => 'required|date',
            'to_date' => 'required|date',
            'company_id' => 'required|integer',
        ]);

        return response()->json($this->service->buildPayload($request));
    }
}
