<?php

namespace App\Jobs;

use App\Http\Controllers\DeviceCameraModel2Controller;
use App\Http\Controllers\Mqtt\FaceDeviceController;
use App\Models\Device;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeleteEmployeeFromDevices implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    // The employee row is gone by the time the job fires, so we accept the
    // identifying scalars eagerly instead of an Employee model.
    public function __construct(public int $companyId, public string $systemUserId) {}

    // Legacy fingerprint SDK models served by env('SDK_URL'). OX-900 has its own
    // cloud gateway and MYTIME1 talks via MQTT, so they're handled separately.
    private const LEGACY_SDK_MODELS = ['OX-866', 'OX-886', 'OX-966', 'OX-745', 'OX-945', 'OX-1000'];

    public function handle(): void
    {
        $supportedModels = array_merge(['OX-900', 'MYTIME1'], self::LEGACY_SDK_MODELS);

        $devices = Device::where('company_id', $this->companyId)
            ->whereIn('model_number', $supportedModels)
            ->get();

        foreach ($devices as $device) {
            try {
                if ($device->model_number === 'OX-900') {
                    $sdk = new DeviceCameraModel2Controller(
                        $device->camera_sdk_url,
                        $device->device_id,
                        $device->admin_username,
                        $device->admin_password
                    );
                    $result = $sdk->deletePersonFromDevice($this->systemUserId);
                } elseif ($device->model_number === 'MYTIME1') {
                    // MQTT gateway path keys off serial_number per
                    // EmployeeDeviceEnrollmentController.
                    $resp = (new FaceDeviceController())->gatewayRequest(
                        'DELETE',
                        "api/device/{$device->serial_number}/person/{$this->systemUserId}",
                        [],
                        []
                    );
                    $result = $resp instanceof \Illuminate\Http\JsonResponse
                        ? $resp->getData(true)
                        : $resp;
                } else {
                    // Legacy OX-* — same protocol as SDKController::deletePersonDetails
                    // fallthrough branch: POST {SDK_URL}/{device_id}/DeletePerson.
                    $sdkUrl = env('APP_ENV') === 'desktop'
                        ? 'http://' . gethostbyname(gethostname()) . ':8080'
                        : env('SDK_URL');

                    $response = Http::timeout(60)
                        ->withoutVerifying()
                        ->withHeaders(['Content-Type' => 'application/json'])
                        ->post(
                            rtrim($sdkUrl, '/') . '/' . $device->device_id . '/DeletePerson',
                            ['userCodeArray' => [$this->systemUserId]]
                        );
                    $result = $response->json() ?? ['http_status' => $response->status()];
                }

                Log::info('Deleted employee from device', [
                    'company_id'     => $this->companyId,
                    'system_user_id' => $this->systemUserId,
                    'device_id'      => $device->device_id,
                    'model_number'   => $device->model_number,
                    'result'         => $result,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to delete employee from device', [
                    'company_id'     => $this->companyId,
                    'system_user_id' => $this->systemUserId,
                    'device_id'      => $device->device_id,
                    'model_number'   => $device->model_number,
                    'error'          => $e->getMessage(),
                ]);
            }
        }
    }
}
