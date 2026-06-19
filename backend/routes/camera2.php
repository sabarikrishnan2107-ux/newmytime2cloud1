<?php

use App\Http\Controllers\Camera2;
use Illuminate\Support\Facades\Route;


Route::post('camera2_push_events', [Camera2::class, 'camera2PushEvents']);
Route::get('camera2_push_events', [Camera2::class, 'camera2PushEvents']);

// Face Server device - Heartbeat
Route::any('Subscribe/heartbeat', function () {
    return response()->json(['result' => 1]);
});

// Face Server device - Face verification push
Route::any('Subscribe/Verify', function (\Illuminate\Http\Request $request) {
    $operator = $request->input('operator');
    $info = $request->input('info', []);
    if (!in_array($operator, ['VerifyPush', 'RecPush']) || empty($info)) {
        return response()->json(['result' => 1]);
    }

    $userId = $info['RFIDCard'] ?? $info['PersonUUID'] ?? $info['CustomizeID']
        ?? $info['customId'] ?? $info['personId'] ?? null;
    $deviceId = $info['DeviceID'] ?? $info['facesluiceId'] ?? null;
    $rawTime = $info['CreateTime'] ?? $info['time'] ?? now()->format('Y-m-d H:i:s');
    $logTime = str_replace('T', ' ', trim($rawTime));
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $logTime)) {
        $logTime .= ':00';
    }
    $personName = $info['Name'] ?? $info['personName'] ?? $info['persionName'] ?? '';

    if (!$userId || !$deviceId) return response()->json(['result' => 1]);

    $device = \App\Models\Device::where('device_id', $deviceId)->first();
    $companyId = $device->company_id ?? 0;

    // Duplicate check (30 sec)
    $exists = \App\Models\AttendanceLog::where('UserID', $userId)
        ->where('company_id', $companyId)
        ->where('LogTime', '>=', date('Y-m-d H:i:s', strtotime($logTime) - 30))
        ->where('LogTime', '<=', $logTime)
        ->exists();

    if (!$exists) {
        \App\Models\AttendanceLog::create([
            'UserID' => $userId, 'DeviceID' => $deviceId, 'LogTime' => $logTime,
            'company_id' => $companyId, 'branch_id' => $device->branch_id ?? 0,
            'log_type' => null, 'log_date' => date('Y-m-d', strtotime($logTime)),
            'status' => 'Allowed', 'mode' => 'Face', 'channel' => 'device',
        ]);
        \Log::info("Face Server: Log {$userId} ({$personName}) at {$logTime} device {$deviceId}");
    }

    return response()->json(['result' => 1]);
});

// Catch other device push paths
Route::any('Subscribe/{any?}', function (\Illuminate\Http\Request $request, $any = '') {
    \Log::info('Face Server: ' . ($request->input('operator') ?? $any), ['ip' => $request->ip()]);
    return response()->json(['result' => 1]);
})->where('any', '.*');
