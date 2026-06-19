<?php

namespace App\Http\Controllers\Visitor;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\VisitorAttendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RenderController extends Controller
{
    public function renderDailyReport(Request $request)
    {
        // Define the validation rules
        $rules = [
            'userIds' => 'required|array|max:' . $request->max ?? 10, // Must be an array
            'userIds.*' => 'numeric', // Each value in the array must be numeric
            'date' => 'required|date', // Must be a valid date format
            'company_id' => 'required|numeric', // Must be numeric
        ];

        // Define custom error messages for the 'date' rule
        $customMessages = [
            'date.date' => 'The :attribute field must be a valid date format. E.g. ' . date("Y-m-d"),
        ];


        // Run the validation
        $validator = Validator::make($request->all(), $rules, $customMessages);

        // Check if validation fails    
        if ($validator->fails()) {
            // If validation fails, return the error response
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $userIds = $request->userIds ?? [6666, 1111, 5656, 8888];
        $date = $request->date ?? date("Y-m-d");
        $company_id = $request->company_id ?? 8;

        $response = $this->run($userIds, $date, $company_id);

        return $this->response("Data has been generated", $response, true);
    }

    public function run($userIds, $date, $company_id)
    {
        $arr = [];

        $statuses = ["Approved", "Rejected", "Pending", "Cancelled"];


        foreach ($userIds as $userId) {
            $in = $this->generateRandomTime('09:30', '14:00');
            $out = $this->generateRandomTime('16:30', '21:30');
            $arr[]  = [
                'date' => $date,
                'visitor_id' => $userId,
                'status' => $statuses[array_rand($statuses)],
                'in' => $in,
                'out' => $out,
                'total_hrs' => $this->calculateTotalHours($in, $out),
                'device_id_in' => "OX-8862021010010",
                'device_id_out' => "OX-8862021010010",
                'date_in' => $date,
                'date_out' => $date,
                'company_id' => $company_id
            ];
        }

        $model = VisitorAttendance::query();
        $model->whereIn("visitor_id", $userIds)->whereDate("date", $date)->delete();
        $model->insert($arr);

        return $arr;
    }
}
