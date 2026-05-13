<?php

namespace App\Http\Requests\ReportNotification;

use Illuminate\Foundation\Http\FormRequest;
use App\Traits\failedValidationWithName;


class UpdateRequest extends FormRequest
{
    use failedValidationWithName; // gives response when validation failed

    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $isAccessControl = $this->type === "access_control";

        $arr = [
            'subject' => 'required',
            // 'body' => 'nullable',
            'email_body' => 'nullable|string|max:5000',
            'day' => 'nullable',
            'date' => 'nullable',
            'company_id' => 'required',
            'branch_id' => 'required',
            'frequency' => 'required',
            // Access-control notifications use a from_time/to_time window
            // instead of the single `time` field, so we relax it for that
            // type regardless of frequency.
            'time' => $isAccessControl ? 'nullable' : 'required',
            'reports' => 'nullable|array|max:5',
            'mediums' => 'nullable|array',
            'managers' => 'nullable|array',
        ];

        if ($isAccessControl) {
            $arr['from_time'] = 'required';
            $arr['to_time']   = 'required';
            $arr['days']      = 'required';
        } else {
            if ($this->frequency == "Weekly") {
                $arr['day'] = "required";
            }
            if ($this->frequency == "Monthly") {
                $arr['date'] = "required";
            }
        }

        return $arr;
    }

    public function messages()
    {
        return [
            'company_id.required' => 'The company field is required',
            'reports.min' => 'Atleast 1 Report must be selected',
            'mediums.min' => 'Atleast 1 Medium must be selected',
            'tos.min' => 'Atleast 1 Email must be selected',
            'managers.min' => 'Atleast 1 Manager must be selected',
        ];
    }
}
