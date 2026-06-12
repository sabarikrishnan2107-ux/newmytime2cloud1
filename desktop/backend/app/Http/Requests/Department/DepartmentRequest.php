<?php

namespace App\Http\Requests\Department;

use App\Traits\failedValidationWithName;
use Illuminate\Foundation\Http\FormRequest;

class DepartmentRequest extends FormRequest
{
    use failedValidationWithName;

    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name'         => 'required|string|min:4|max:50',
            'description'  => 'required|string|min:4|max:200',

            // Changed from string validation to integer/exists validation
            'branch_id'    => 'required|integer',

            // Ensure company_id is a valid integer and exists in the companies table
            'company_id'   => 'required|integer|exists:companies,id',
        ];
    }
}
