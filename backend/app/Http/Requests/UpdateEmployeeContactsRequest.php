<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeContactsRequest extends FormRequest
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
            'contact'            => ['sometimes', 'nullable', 'array', 'required_without_all:present_address,permanent_address,primary_contact,secondary_contact'],
            'present_address'    => ['sometimes', 'nullable', 'array', 'required_without_all:contact,permanent_address,primary_contact,secondary_contact'],
            'permanent_address'  => ['sometimes', 'nullable', 'array', 'required_without_all:contact,present_address,primary_contact,secondary_contact'],
            'primary_contact'    => ['sometimes', 'nullable', 'array', 'required_without_all:contact,present_address,permanent_address,secondary_contact'],
            'secondary_contact'  => ['sometimes', 'nullable', 'array', 'required_without_all:contact,present_address,permanent_address,primary_contact'],
        ];
    }

    public function messages(): array
    {
        return [
            'contact.array' => 'contact must be a JSON object.',
            'present_address.array' => 'present_address must be a JSON object.',
            'permanent_address.array' => 'permanent_address must be a JSON object.',
            'primary_contact.array' => 'primary_contact must be a JSON object.',
            'secondary_contact.array' => 'secondary_contact must be a JSON object.',
        ];
    }
}
