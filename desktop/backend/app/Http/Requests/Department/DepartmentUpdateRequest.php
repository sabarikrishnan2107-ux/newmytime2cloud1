<?php

namespace App\Http\Requests\Department;

use App\Traits\failedValidationWithName;
use Illuminate\Foundation\Http\FormRequest;

class DepartmentUpdateRequest extends FormRequest
{
    use failedValidationWithName;
    
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name'        => 'required|string|min:4|max:50',
            'description' => 'required|string|min:4|max:200',
            
            // Validate that branch_id is a number and exists in the branches table
            'branch_id'   => 'required|integer',
            
            // Validate that company_id is a number and exists in the companies table
            'company_id'  => 'required|integer|exists:companies,id',
        ];
    }
}