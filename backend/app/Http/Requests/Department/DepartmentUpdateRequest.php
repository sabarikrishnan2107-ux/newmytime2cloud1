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

    protected function prepareForValidation()
    {
        // No branch selected means a company-wide (common) department,
        // e.g. Accounts or HR shared by all branches.
        if (! $this->input('branch_id')) {
            $this->merge(['branch_id' => null]);
        }
    }

    public function rules()
    {
        return [
            'name'        => 'required|string|min:4|max:50',
            'description' => 'required|string|min:4|max:200',

            // Optional: null = common department shared across all branches
            'branch_id'   => 'nullable|integer|exists:company_branches,id',

            // Validate that company_id is a number and exists in the companies table
            'company_id'  => 'required|integer|exists:companies,id',
        ];
    }
}