<?php

namespace App\Http\Requests\RealTimeLocation;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;

class StoreRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Mobile app sends { employee_id, ... } without device_id. Map those to the
        // schema column names so validation + persistence work without a mobile
        // change.
        $merged = [];

        if (! $this->filled('UserID') && $this->filled('employee_id')) {
            $merged['UserID'] = (string) $this->input('employee_id');
        }

        if (! $this->filled('device_id')) {
            $userId = $merged['UserID'] ?? $this->input('UserID') ?? $this->input('employee_id');
            if ($userId !== null) {
                $merged['device_id'] = 'Mobile-' . $userId;
            }
        }

        if (! empty($merged)) {
            $this->merge($merged);
        }
    }

    public function rules()
    {
        return [
            'company_id' => 'required',
            'device_id' => 'required',
            'UserID' => 'required',
            'date' => 'nullable',
            'longitude' => 'required|numeric',
            'latitude' => 'required|numeric',
            'short_name' => 'nullable',
            'full_name' => 'nullable',
            'status' => 'nullable|string|in:inside,outside',
            'logged_at' => 'nullable|date',
            'employee_id' => 'nullable',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        Log::warning('realtime_location validation failed', [
            'payload' => $this->all(),
            'errors'  => $validator->errors()->toArray(),
        ]);

        throw new HttpResponseException(
            response()->json([
                'status'  => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422)
        );
    }
}
