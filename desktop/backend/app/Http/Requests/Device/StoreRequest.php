<?php

namespace App\Http\Requests\Device;

use App\Traits\failedValidationWithName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequest extends FormRequest
{
    use failedValidationWithName;
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        $deviceId = $this->device_id;
        $companyId = $this->company_id;
        return [
            'branch_id' => 'required',
            'name' => ['required', 'min:2', 'max:50'],
            'short_name' => ['required', 'min:3', 'max:50'],
            'location' => ['nullable', 'min:2', 'max:300'],
            'model_number' => ['nullable', 'min:4', 'max:20'],

            'device_id' => [
                $this->model_number === 'Camera' ? 'nullable' : 'required',
                Rule::unique('devices')->where(function ($query) use ($deviceId, $companyId) {
                    return $query->where('device_id', $deviceId)
                        ->where('company_id', $companyId);
                }),

            ],
            'camera_rtsp_ip' => [
                $this->model_number === 'Camera' ? 'required' : 'nullable',
                'ip',
            ],
            'utc_time_zone' => 'required',
            'function' => 'required',
            'device_type' => ['required'],
            'status_id' => ['required', 'min:1', 'integer'],
            'company_id' => ['required', 'min:1', 'integer'],
            'mode' => ['nullable'],
            'ip' => 'nullable',
            //'camera_save_images' => 'required'
            'camera_rtsp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'camera_rtsp_path' => ['nullable', 'string', 'max:255'],
            'camera_username' => ['nullable', 'string', 'max:255'],
            'camera_password' => ['nullable', 'string', 'max:255'],
            'admin_username' => ['nullable', 'string', 'max:255'],
            'admin_password' => ['nullable', 'string', 'max:255'],
            'camera_sdk_url' => ['nullable', 'string', 'max:255'],
            'door_pin' => ['required', 'digits:4'],
            'device_photo' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'branch_id' => 'Branch is required',
            'short_name' => 'Prefix is required',
            'device_id' => 'Serial Number is required',
            'utc_time_zone' => 'Timezone is required',
            'device_type' => 'Device Type is required',
            'status_id' => 'Status is required',
            'door_pin.required' => 'Door PIN is required',
            'door_pin.digits'   => 'Door PIN must be exactly 4 digits',
        ];
    }
}
