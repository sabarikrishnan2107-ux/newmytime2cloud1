<?php

namespace App\Http\Controllers;

use App\Models\AutoRegenerateSetting;
use Illuminate\Http\Request;

class AutoRegenerateController extends Controller
{
    public function index(Request $request)
    {
        $settings = AutoRegenerateSetting::where('company_id', $request->company_id)
            ->with('branch:id,branch_name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $settings]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'company_id' => 'required',
            'branch_id' => 'nullable|integer',
            'frequency' => 'required|in:daily,weekly,monthly',
            'run_time' => 'required|string|size:5',
            'day_of_week' => 'nullable|integer|min:0|max:6',
            'day_of_month' => 'nullable|integer|min:1|max:28',
            'lookback_days' => 'required|integer|min:1|max:31',
        ]);

        $setting = AutoRegenerateSetting::create($request->only([
            'company_id', 'branch_id', 'frequency', 'run_time',
            'day_of_week', 'day_of_month', 'lookback_days',
        ]));

        $setting->load('branch:id,branch_name');

        return response()->json(['success' => true, 'data' => $setting]);
    }

    public function update(Request $request, $id)
    {
        $setting = AutoRegenerateSetting::where('company_id', $request->company_id)->findOrFail($id);

        $request->validate([
            'frequency' => 'sometimes|in:daily,weekly,monthly',
            'run_time' => 'sometimes|string|size:5',
            'day_of_week' => 'nullable|integer|min:0|max:6',
            'day_of_month' => 'nullable|integer|min:1|max:28',
            'lookback_days' => 'sometimes|integer|min:1|max:31',
            'is_active' => 'sometimes|boolean',
        ]);

        $setting->update($request->only([
            'branch_id', 'frequency', 'run_time',
            'day_of_week', 'day_of_month', 'lookback_days', 'is_active',
        ]));

        $setting->load('branch:id,branch_name');

        return response()->json(['success' => true, 'data' => $setting]);
    }

    public function destroy(Request $request, $id)
    {
        $setting = AutoRegenerateSetting::where('company_id', $request->company_id)->findOrFail($id);
        $setting->delete();

        return response()->json(['success' => true, 'message' => 'Setting deleted']);
    }

    public function toggleActive(Request $request, $id)
    {
        $setting = AutoRegenerateSetting::where('company_id', $request->company_id)->findOrFail($id);
        $setting->update(['is_active' => !$setting->is_active]);

        return response()->json(['success' => true, 'is_active' => $setting->is_active]);
    }
}
