<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Company;
use App\Models\Employee;
use DateTime;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;

class ClientController extends Controller
{




    public function downloadPostmanJson(Request $request)
    {
        // Define the path to the file in the public folder
        $filePath = public_path("mytime2cloud-client-api-V1.postman_collection.json");

        // Check if the file exists
        if (file_exists($filePath)) {
            // Create a response to download the file
            return response()->download($filePath,   "mytime2cloud-client-api-V1.postman_collection.json");
        } else {
            // Return a 404 Not Found response if the file doesn't exist
            abort(404);
        }
    }
    public function getAttendanceLogs(Request $request)
    {



        //return [];
        try {
            $token = request()->bearerToken();
            Storage::append("logs/api_client/api-requests-attendance-logs-" . date('Y-m-d') . ".txt", date("Y-m-d H:i:s") .  " : " . $token . " : " . json_encode($request->all()));
            if ($token != '') {
                $company = Company::where("api_access_token", $token)->get()->first();


                if ($company) {
                    $company_id = $company['id'];
                    $date_from = $request->date_from;
                    $date_to = $request->date_to;
                    $employee_ids = $request->employee_ids;
                    if ($date_from != '' && $date_to != '') {
                        $date_from_obj = new DateTime($date_from);
                        $date_to_obj = new DateTime($date_to);

                        $abs_diff = $date_to_obj->diff($date_from_obj)->format("%a"); //3
                        if (!is_array($employee_ids)) {
                            $employee_ids = [$employee_ids];
                        }
                        if ($abs_diff <= 31) {
                            $model = AttendanceLog::where("company_id", $company_id)
                                ->whereDate("LogTime", ">=", $date_from . ' 00:00:00')
                                ->whereDate("LogTime", "<=", $date_to . ' 23:59:59');

                            $model->when($request->filled('employee_ids') && count($request->employee_ids) > 0, function ($q) use ($request) {
                                $q->whereIn('UserID', $request->employee_ids);
                            });

                            $model->select(["id", "UserID as employee_id", "LogTime as date_time"]);

                            $model->orderBy("LogTime", "ASC");

                            return  $model->get()->makeHidden(['time', 'edit_date', 'show_log_time', 'date', 'hour_only']);
                        } else {
                            return Response::json(['reecord' => null, 'message' => 'Maximum days count is 31 days only in one request', 'status' => false,], 200);
                        }
                    } else {
                        return Response::json(['reecord' => null, 'message' => 'Date from and Date to are missing', 'status' => false,], 200);
                    }
                } else {
                    return Response::json(['reecord' => null, 'message' => 'Invalid API Access Token', 'status' => false,], 200);
                }
            } else {
                return Response::json(['reecord' => null, 'message' => 'API Token is missing', 'status' => false,], 200);
            }
        } catch (Exception $e) {
            return Response::json([
                'record' => null,
                'message' => 'Error  processing your request',
                'status' => false,
            ], 200);
        }
    }
    public function getEmployeesList(Request $request)
    {
        // return [];


        try {
            $token = request()->bearerToken();
            Storage::append("logs/api_client/api-requests-employee-list-"  . date('Y-m-d') . ".txt", date("Y-m-d H:i:s") .  " : " . $token . " : " . json_encode($request->all()));
            if ($token != '') {
                $company = Company::where("api_access_token", $token)->get()->first();


                if ($company) {
                    $company_id = $company['id'];


                    $model = Employee::where("company_id", $company_id);


                    $model->when($request->filled('employee_ids') && count($request->employee_ids) > 0, function ($q) use ($request) {
                        $q->whereIn('system_user_id', $request->employee_ids);
                    });

                    $model->with([
                        'user' => function ($q) use ($company_id) {
                            $q->select(['id', 'email']);
                            $q->withOut(['assigned_permissions']);
                            $q->where("company_id", $company_id);
                        }
                    ]);
                    $model->withOut(["schedule", "department", "designation", "sub_department", "branch"]);
                    $model->select(["id", "system_user_id", 'user_id', 'first_name', 'last_name', 'phone_number']);

                    $model->orderBy("first_name", "ASC");

                    return  $model->get()->makeHidden(['time', 'edit_date', 'show_log_time', 'date', 'hour_only']);
                } else {
                    return Response::json(['reecord' => null, 'message' => 'Invalid API Access Token', 'status' => false,], 200);
                }
            } else {
                return Response::json(['reecord' => null, 'message' => 'API Token is missing', 'status' => false,], 200);
            }
        } catch (Exception $e) {
            return Response::json([
                'record' => null,
                'message' => 'Error  processing your request' . $e,
                'status' => false,
            ], 200);
        }
    }
    public function getAttendanceReports(Request $request)
    {

        //return [];


        try {
            $token = request()->bearerToken();
            Storage::append("logs/api_client/api-requests-attendance-reports-" . date('Y-m-d') . ".txt", date("Y-m-d H:i:s") .  " : " . $token . " : " . json_encode($request->all()));
            if ($token != '') {
                $company = Company::where("api_access_token", $token)->get()->first();


                if ($company) {
                    $company_id = $company['id'];
                    $date_from = $request->date_from;
                    $date_to = $request->date_to;
                    $employee_ids = $request->employee_ids;
                    if ($date_from != '' && $date_to != '') {
                        $date_from_obj = new DateTime($date_from);
                        $date_to_obj = new DateTime($date_to);

                        $abs_diff = $date_to_obj->diff($date_from_obj)->format("%a"); //3
                        if (!is_array($employee_ids)) {
                            $employee_ids = [$employee_ids];
                        }
                        if ($abs_diff <= 31) {
                            $model = Attendance::where("company_id", $company_id)
                                ->whereDate("date", ">=", $date_from . ' 00:00:00')
                                ->whereDate("date", "<=", $date_to . ' 23:59:59');
                            $model->with([
                                'employeeapi' => function ($q) use ($request, $company_id) {
                                    $q->select(['user_id', 'system_user_id', 'first_name', 'last_name', 'phone_number']);

                                    $q->where("company_id", $company_id);
                                    //$q->withOut(['show_joining_date']);
                                    //$q->exclude(['show_joining_date']);
                                    //$q->except(['show_joining_date']);
                                    //$q->makeHidden(['show_joining_date']);
                                    //$q->setHidden(['show_joining_date']);



                                    $q->with([
                                        'user' => function ($q) use ($company_id) {
                                            $q->select(['id', 'email']);
                                            $q->withOut(['assigned_permissions']);
                                            $q->where("company_id", $company_id);
                                        }
                                    ]);
                                }
                            ]);
                            $model->when($request->filled('employee_ids') && count($request->employee_ids) > 0, function ($q) use ($request) {
                                $q->whereIn('employee_id', $request->employee_ids);
                            });

                            $model->with('device_in', function ($q) use ($company_id) {
                                $q->select(['name',  "device_id"]);
                                $q->where('company_id', $company_id);
                            });

                            $model->with('device_out', function ($q) use ($company_id) {
                                $q->select(['name',  "device_id"]);
                                $q->where('company_id', $company_id);
                            });
                            $model->select([DB::raw('date as date_attendance'),  "id", "employee_id",  "logs", "status", "in as in_time", "device_id_in", "out as out_time", "device_id_out", "total_hrs", "date"]);
                            //$model->select(["id", "employee_id",  "logs", "status", "in", "device_id_in", "out", "device_id_out", "total_hrs"]);

                            $model->orderBy("date", "ASC");

                            return  $model->get()->makeHidden(['time',  'show_log_time',   'hour_only']);
                        } else {
                            return Response::json(['reecord' => null, 'message' => 'Maximum days count is 31 days only in one request', 'status' => false,], 200);
                        }
                    } else {
                        return Response::json(['reecord' => null, 'message' => 'Date from and Date to are missing', 'status' => false,], 200);
                    }
                } else {
                    return Response::json(['reecord' => null, 'message' => 'Invalid API Access Token', 'status' => false,], 200);
                }
            } else {
                return Response::json(['reecord' => null, 'message' => 'API Token is missing', 'status' => false,], 200);
            }
        } catch (Exception $e) {
            return Response::json([
                'record' => null,
                'message' => 'Error  processing your request' . $e,
                'status' => false,
            ], 200);
        }
    }
    public function test()
    {

        return [];
    }
    public function generateToken(Request $request, $company_id)
    {
        try {
            $access_token = md5(uniqid() . rand(1000000, 9999999));
            $model = Company::whereId($company_id)->first();

            $data = ["api_access_token" => $access_token, "api_datetime" => date('Y-m-d H:i:s')];

            $model->update($data);


            return Response::json([
                'record' => null,
                'message' => 'API token updated successfully',
                'status' => true,
            ], 200);
        } catch (Exception $e) {
            return Response::json([
                'record' => null,
                'message' => 'Error updating API token',
                'status' => false,
            ], 200);
        }
    }
}
