<?php

namespace App\Http\Requests\Employee;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequestFromDevice extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $employee = [
            "employee_id" => $this->employee_id,
            "company_id" => $this->company_id
        ];

        $employeeDevice = [
            "system_user_id" => $this->system_user_id,
            "company_id" => $this->company_id
        ];

        $controller = new Controller;

        return [
            'full_name' => 'nullable|min:2|max:100',
            'company_id' => 'required|integer',
            'profile_picture' => 'nullable',
            'rfid_card_number' => 'nullable',
            'rfid_card_password' => 'nullable',
            'fp' => 'array',
            'palm' => 'array',
            'employee_id' => ['required'],
            'system_user_id' => ['required', 'regex:/^[1-9][0-9]*$/'],
        ];
    }

    // public function messages()
    // {
    //     return [
    //         'employees.*.employee_id.required' => 'Each employee must have an employee ID.',
    //         'employees.*.employee_id.unique' => 'The employee ID must be unique.',

    //         'employees.*.system_user_id.required' => 'System user ID is required for each employee.',
    //         'employees.*.employee_id.unique' => 'The System user ID must be unique.',
    //         'employees.*.system_user_id.regex' => 'The employee device ID should not start with zero.',

    //         'employees.*.full_name.required' => 'Each employee must have a full name.',
    //         'employees.*.full_name.min' => 'The full name must be at least 2 characters.',
    //         'employees.*.profile_picture.required' => 'Each employee must have a profile picture.',

    //     ];
    // }
}
