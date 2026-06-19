<?php

namespace App\Http\Requests\ChangeRequest;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRequest extends FormRequest
{
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
        return [
            'request_type' => "sometimes|required",
            'from_date' => "sometimes|required",
            'to_date' => 'sometimes|required',
            'from_time' => 'nullable',
            'to_time' => 'nullable',
            'requested_at' => 'nullable',
            'remarks' => "nullable|max:100",
            'status' => "nullable",
            'attachment' => "nullable|file",
            'employee_device_id' => "sometimes|required",
            'branch_id' => "sometimes|required",
            'company_id' => "sometimes|required",
        ];
    }
}
