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
        $mediums = (array) $this->input('mediums', []);

        $arr = [
            'subject' => 'required',
            'email_body' => 'nullable|string|max:5000',
            'day' => 'nullable',
            'date' => 'nullable',
            'company_id' => 'required',
            'branch_id' => 'required',
            'frequency' => 'required',
            'time' => $isAccessControl ? 'nullable' : 'required',
            'reports' => 'nullable|array|max:5',
            'mediums' => 'nullable|array',
            'mediums.*' => 'in:Email,Whatsapp,FTP,API',
            'formats' => 'nullable|array',
            'formats.*' => 'in:PDF,Excel',
            'managers' => 'nullable|array',
        ];

        if (in_array('FTP', $mediums, true)) {
            $arr['ftp_config'] = 'required|array';
            $arr['ftp_config.protocol'] = 'required|in:ftp,sftp';
            $arr['ftp_config.host'] = 'required|string';
            $arr['ftp_config.port'] = 'nullable|integer';
            $arr['ftp_config.username'] = 'required|string';
            $arr['ftp_config.password'] = 'nullable|string';
            $arr['ftp_config.remote_path'] = 'required|string';
        }

        if (in_array('API', $mediums, true)) {
            $arr['api_config'] = 'required|array';
            $arr['api_config.endpoint'] = 'required|url';
            $arr['api_config.auth_type'] = 'required|in:none,api_key,bearer,basic';
            $arr['api_config.auth_value'] = 'nullable|string';
            $arr['api_config.auth_header_name'] = 'required_if:api_config.auth_type,api_key|nullable|string';
        }

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
