<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeDeviceEnrollmentController extends Controller
{
    public function index(Request $request, $employeeId): JsonResponse
    {
        $employee = Employee::find($employeeId);
        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        if (empty($employee->system_user_id)) {
            return response()->json(['data' => [], 'errors' => []]);
        }

        $devices = Device::where('company_id', $employee->company_id)
            ->where('model_number', '!=', 'Manual')
            ->where('model_number', 'not like', '%Mobile%')
            ->where('name', 'not like', '%Manual%')
            ->where('name', 'not like', '%manual%')
            ->where('name', 'not like', '%Mobile%')
            ->where('name', 'not like', '%mobile%')
            ->get();

        $deviceController = new DeviceController();
        $data   = [];
        $errors = [];

        foreach ($devices as $device) {
            $probe = null;
            try {
                $probe = $deviceController->probeDevicePerson($device, $employee->system_user_id);
            } catch (\Throwable $e) {
                $errors[] = [
                    'device_id'   => $device->device_id,
                    'device_name' => $device->name,
                    'message'     => $e->getMessage(),
                ];
            }

            $isAvailable = $probe !== null;

            $data[] = [
                'device_id'   => $device->device_id,
                'device_name' => $device->name,
                'location'    => $isAvailable ? $device->location : null,
                'available'   => $isAvailable,
                'face'        => $isAvailable ? (bool) $probe['face'] : false,
                'rfid'        => $isAvailable ? (bool) $probe['rfid'] : false,
                'pin'         => $isAvailable ? (bool) $probe['pin'] : false,
            ];
        }

        return response()->json(['data' => $data, 'errors' => $errors]);
    }

    public function destroy(Request $request, $employeeId, $deviceId): JsonResponse
    {
        $employee = Employee::find($employeeId);
        if (!$employee) {
            return response()->json(['success' => false, 'message' => 'Employee not found'], 404);
        }
        if (empty($employee->system_user_id)) {
            return response()->json(['success' => false, 'message' => 'Employee has no system_user_id'], 422);
        }

        $device = Device::where('device_id', $deviceId)->first();
        if (!$device || $device->company_id !== $employee->company_id) {
            return response()->json(['success' => false, 'message' => 'Device not found for this employee'], 404);
        }

        try {
            if ($device->model_number === 'MYTIME1') {
                $resp = (new \App\Http\Controllers\Mqtt\FaceDeviceController())
                    ->gatewayRequest(
                        'DELETE',
                        "api/device/{$device->serial_number}/person/{$employee->system_user_id}",
                        [],
                        []
                    );
                $resp = $resp instanceof \Illuminate\Http\JsonResponse
                    ? $resp->getData(true)
                    : $resp;
                if (isset($resp['error']) || isset($resp['message'])) {
                    return response()->json([
                        'success' => false,
                        'message' => $resp['message'] ?? $resp['error'],
                    ], 422);
                }
            } elseif ($device->model_number === 'OX-900') {
                $sdk = new DeviceCameraModel2Controller(
                    $device->camera_sdk_url,
                    $device->serial_number
                );
                if (!method_exists($sdk, 'deletePerson')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Delete not supported on this device model',
                    ], 422);
                }
                $sdk->deletePerson($employee->system_user_id);
            } else {
                $sdk = new SDKController();
                if (!method_exists($sdk, 'deletePerson')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Delete not supported on this device model',
                    ], 422);
                }
                $sdk->deletePerson($device->device_id, $employee->system_user_id);
            }
        } catch (\Throwable $e) {
            \Log::warning('EmployeeDeviceEnrollment destroy failed', [
                'employee_id'    => $employeeId,
                'device_id'      => $deviceId,
                'system_user_id' => $employee->system_user_id,
                'error'          => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json(['success' => true]);
    }
}
