<?php

namespace App\Http\Requests\EmployeeLeaves;

use App\Traits\failedValidationWithName;
use Illuminate\Foundation\Http\FormRequest;

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
        $isDraft = $this->boolean('is_draft');

        return [
            'company_id' => 'required',
            'employee_id' => 'required',
            'leave_type_id' => 'nullable',
            'start_date' => $isDraft ? 'nullable' : 'required',
            'end_date' => $isDraft ? 'nullable' : 'required',
            'reason' => $isDraft ? 'nullable' : 'required',
            'reporting_manager_id' => $isDraft ? 'nullable' : 'required',
            'alternate_employee_id' => 'nullable',
            'day_type' => 'nullable|in:full,half_first,half_second',
            'emergency_contact' => 'nullable|string|max:64',
            'is_draft' => 'nullable|boolean',
        ];
    }
}
