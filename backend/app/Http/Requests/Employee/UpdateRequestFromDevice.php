<?php

namespace App\Http\Requests\Employee;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRequestFromDevice extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'full_name' => 'nullable|min:2|max:100',
            'company_id' => 'required|integer',
            'profile_picture' => 'nullable',
            'rfid_card_number' => 'nullable',
            'rfid_card_password' => 'nullable',
            'fp' => 'array',
            'palm' => 'nullable|array',
            'system_user_id' => 'required'
        ];
    }
}
