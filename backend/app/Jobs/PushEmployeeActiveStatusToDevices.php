<?php

namespace App\Jobs;

use App\Http\Controllers\DeviceCameraModel2Controller;
use App\Http\Controllers\Mqtt\FaceDeviceController;
use App\Models\Device;
use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushEmployeeActiveStatusToDevices implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    // Legacy fingerprint SDK models. They have no enable/disable endpoint but the
    // /Person/AddRange route accepts an `expiry` — past date locks the user out,
    // far-future date re-activates. Same trick as SDKController::setUserExpiry.
    private const LEGACY_SDK_MODELS = ['OX-866', 'OX-886', 'OX-966', 'OX-745', 'OX-945', 'OX-1000'];
    private const EXPIRY_LOCKED = '2023-01-01 00:00:00';
    private const EXPIRY_ACTIVE = '2089-01-01 00:00:00';

    public function __construct(public int $employeeId, public bool $isActive) {}

    public function handle(): void
    {
        $employee = Employee::find($this->employeeId);
        if (!$employee) {
            return;
        }

        // Device push is best-effort. The backend gate in AttendanceLogController is the
        // source of truth — even if every device push fails, non-active employees still
        // cannot record attendance because their logs are tagged rejected_reason and
        // skipped by the auto-regenerate / recalculate pipeline.
        Log::info('Employee active status transition', [
            'employee_id'    => $employee->id,
            'system_user_id' => $employee->system_user_id,
            'is_active'      => $this->isActive,
        ]);

        // OX-900: per-person enable/disable + recognition_type flip.
        $this->pushOx900($employee);

        // Legacy OX-* fingerprint models: expiry-date trick.
        $this->pushLegacySdk($employee);

        // MYTIME1: no enable/disable endpoint exists, so we mirror delete-on-disable
        // and re-enroll on re-activate using the stored profile picture.
        $this->pushMytime1($employee);
    }

    private function pushOx900(Employee $employee): void
    {
        $devices = Device::where('company_id', $employee->company_id)
            ->where('model_number', 'OX-900')
            ->get();

        foreach ($devices as $device) {
            try {
                $sdk = new DeviceCameraModel2Controller(
                    $device->camera_sdk_url,
                    $device->device_id,
                    $device->admin_username,
                    $device->admin_password
                );

                if (!$this->isActive) {
                    $sdk->ensureBlacklistTipConfigured('Access Denied');
                }

                $result = $sdk->updatePersonEnabledStatus(
                    $employee->system_user_id,
                    $this->isActive
                );

                Log::info('Pushed enabled status to device', [
                    'employee_id'    => $employee->id,
                    'system_user_id' => $employee->system_user_id,
                    'device_id'      => $device->device_id,
                    'model_number'   => $device->model_number,
                    'is_active'      => $this->isActive,
                    'result'         => $result,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to push enabled status to device', [
                    'employee_id'  => $employee->id,
                    'device_id'    => $device->device_id,
                    'model_number' => $device->model_number,
                    'error'        => $e->getMessage(),
                ]);
            }
        }
    }

    // Legacy OX-* fingerprint devices honour an `expiry` field on the person
    // record. We batch every legacy device into one /Person/AddRange call so the
    // SDK fans it out — matches the legacy setUserExpiry behaviour.
    private function pushLegacySdk(Employee $employee): void
    {
        $deviceIds = Device::where('company_id', $employee->company_id)
            ->whereIn('model_number', self::LEGACY_SDK_MODELS)
            ->pluck('device_id')
            ->all();

        if (empty($deviceIds)) {
            return;
        }

        $displayName = $employee->display_name
            ?: trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''));

        $payload = [
            'personList' => [[
                'name'      => $displayName ?: ('Employee ' . $employee->system_user_id),
                'userCode'  => $employee->system_user_id,
                'timeGroup' => 1,
                'expiry'    => $this->isActive ? self::EXPIRY_ACTIVE : self::EXPIRY_LOCKED,
            ]],
            'snList' => $deviceIds,
        ];

        try {
            $sdkUrl = env('APP_ENV') === 'desktop'
                ? 'http://' . gethostbyname(gethostname()) . ':8080'
                : env('SDK_URL');

            $response = Http::timeout(120)
                ->withoutVerifying()
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post(rtrim($sdkUrl, '/') . '/Person/AddRange', $payload);

            Log::info('Pushed legacy SDK expiry status', [
                'employee_id'    => $employee->id,
                'system_user_id' => $employee->system_user_id,
                'device_ids'     => $deviceIds,
                'is_active'      => $this->isActive,
                'expiry'         => $payload['personList'][0]['expiry'],
                'http_status'    => $response->status(),
                'response'       => $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to push legacy SDK expiry status', [
                'employee_id' => $employee->id,
                'device_ids'  => $deviceIds,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    // MYTIME1 has no enable/disable on the gateway, so we delete the person on
    // disable and re-enrol from the stored profile picture on re-activation.
    // Mirrors the payload shape used in SDKController::filterMQTTMytimeModelDevices.
    private function pushMytime1(Employee $employee): void
    {
        $devices = Device::where('company_id', $employee->company_id)
            ->where('model_number', 'MYTIME1')
            ->get();

        if ($devices->isEmpty()) {
            return;
        }

        $gateway = new FaceDeviceController();

        if (!$this->isActive) {
            foreach ($devices as $device) {
                try {
                    $resp = $gateway->gatewayRequest(
                        'DELETE',
                        "api/device/{$device->serial_number}/person/{$employee->system_user_id}",
                        [],
                        []
                    );
                    $result = $resp instanceof \Illuminate\Http\JsonResponse
                        ? $resp->getData(true)
                        : $resp;

                    Log::info('Removed employee from MYTIME1 (deactivation)', [
                        'employee_id'    => $employee->id,
                        'system_user_id' => $employee->system_user_id,
                        'device_id'      => $device->device_id,
                        'result'         => $result,
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('Failed to remove employee from MYTIME1', [
                        'employee_id' => $employee->id,
                        'device_id'   => $device->device_id,
                        'error'       => $e->getMessage(),
                    ]);
                }
            }
            return;
        }

        // Re-activation path: re-add the person on every MYTIME1 device. Requires
        // the original face image — if it's missing we log a warning so an admin
        // can re-upload manually via the photo upload page.
        $picturePath = $employee->profile_picture_raw
            ? public_path('media/employee/profile_picture/' . $employee->profile_picture_raw)
            : null;

        if (!$picturePath || !file_exists($picturePath)) {
            Log::warning('Cannot re-enrol MYTIME1: profile picture missing', [
                'employee_id'          => $employee->id,
                'system_user_id'       => $employee->system_user_id,
                'profile_picture_raw'  => $employee->profile_picture_raw,
                'mytime1_device_count' => $devices->count(),
            ]);
            return;
        }

        $displayName = $employee->display_name
            ?: trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''));
        $displayName = $displayName ?: ('Employee ' . $employee->system_user_id);
        $pic = base64_encode(file_get_contents($picturePath));

        foreach ($devices as $device) {
            try {
                $resp = $gateway->gatewayRequest('POST', "api/device/{$device->device_id}/person", [
                    'customId'     => $employee->system_user_id,
                    'RFIDCard'     => $employee->system_user_id,
                    'name'         => $displayName,
                    'personType'   => 0,
                    'RFCardMode'   => 0,
                    'tempCardType' => 0,
                    'pic'          => $pic,
                ]);
                $result = $resp instanceof \Illuminate\Http\JsonResponse
                    ? $resp->getData(true)
                    : $resp;

                Log::info('Re-enrolled employee on MYTIME1 (reactivation)', [
                    'employee_id'    => $employee->id,
                    'system_user_id' => $employee->system_user_id,
                    'device_id'      => $device->device_id,
                    'result'         => $result,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to re-enrol employee on MYTIME1', [
                    'employee_id' => $employee->id,
                    'device_id'   => $device->device_id,
                    'error'       => $e->getMessage(),
                ]);
            }
        }
    }
}
