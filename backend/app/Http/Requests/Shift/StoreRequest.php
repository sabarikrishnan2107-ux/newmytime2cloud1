<?php

namespace App\Http\Requests\Shift;

use App\Traits\failedValidationWithName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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

        if ($this->shift_type_id == 3) {
            return [];
        }

        return [
            //'name' => ['required', Rule::unique('shifts')],
            // 'name' => ['required|unique:shifts,name,' . $this->name . '|unique:shifts,branch_id,' . $this->branch_id],
            'name' => ['required', Rule::unique('shifts')->where(function ($query) {
                return $query->where('company_id', $this->input('company_id'));
            })],
            'overtime_interval' => ["required"],
            'shift_type_id' => ["required"],
            'company_id' => ["required"],
            'working_hours' => ['required'],
            'days' => ['nullable'],
            'break' => ["nullable"],
            'on_duty_time' => ["required"],
            'off_duty_time' => ["required"],
            'on_duty_time' => ["required"],
            'off_duty_time' => ["required"],
            'from_date' => ["required"],
            'to_date' => ["required"],
            'late_time' => 'nullable',
            'early_time' => 'nullable',
            'beginning_in' => 'nullable',
            'ending_in' => 'nullable',
            'beginning_out' => 'nullable',
            'ending_out' => 'nullable',
            'absent_min_in' => 'nullable',
            'absent_min_out' => 'nullable',
            'gap_in' => 'nullable',
            'gap_out' => 'nullable',

            // columns for split shift only
            'on_duty_time1' => 'nullable',
            'off_duty_time1' => 'nullable',
            'beginning_in1' => 'nullable',
            'ending_in1' => 'nullable',
            'beginning_out1' => 'nullable',
            'ending_out1' => 'nullable',

            'weekend1' => 'nullable',
            'weekend2' => 'nullable',
            'monthly_flexi_holidays' => 'nullable',
            'branch_id' => 'nullable',

            'halfday'               => 'nullable',
            'halfday_working_hours' => 'nullable',

            'isAutoShift' => "nullable",

            'overtime_type' => "nullable",

            // New Columns from Migration
            'is_auto_deduct'           => 'boolean',
            'break_duration'           => 'nullable|string',
            'unlimited_for_multi'      => 'boolean',
            'minimum_session_duration' => 'nullable|string',
            'first_session_name'       => 'nullable|string',
            'second_session_name'      => 'nullable|string',
            'weekoff_rules'            => 'nullable|array',
            'halfday_rules'            => 'nullable|array',
            'weekend_allowed_ot'       => 'boolean',
            'holiday_allowed_ot'       => 'boolean',
            'daily_ot_allowed_mins'    => 'nullable|string',

            'significant_attendanc_rule_late_coming'    => 'nullable|string',
            'significant_attendanc_rule_early_going'    => 'nullable|string',


            'attendanc_rule_late_coming'    => 'nullable|string',
            'attendanc_rule_early_going'    => 'nullable|string',

        ];
    }
}
