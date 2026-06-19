<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AssignedDepartmentEmployee;
use App\Models\CompanyBranch;
use App\Models\Role;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{

    public function loginwithOTP(Request $request)
    {
        try {
            // Check database connection
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            throw ValidationException::withMessages([
                'email' => ['Database is down'],
            ]);
        }


        $user = User::with('company', 'company.contact', 'employee')->where('email', $request->email)
            ->with("company:id,user_id,name,location,logo,company_code,expiry,contact_number,enable_whatsapp_otp")
            ->first();



        if ($user == null) {
            return Response::json([
                'enable_whatsapp_otp' => 0,
                'user_id' => "",
                'message' => 'Invalid Login details1',
                'status' => true
            ], 200);
        }
        $user->user_type = $this->getUserType($user);


        // return [$user->enable_whatsapp_otp, $user->company->enable_whatsapp_otp];

        if ($user->enable_whatsapp_otp == 1 && $user->company->enable_whatsapp_otp == 1) {
            $mobile_number = $user->user_type == 'employee' ? $user->employee->whatsapp_number : $user->company->contact->whatsapp;



            if ($mobile_number != '')
                $this->generateOTP($mobile_number, $user);
            else {
                return Response::json([
                    'enable_whatsapp_otp' => $user->enable_whatsapp_otp,
                    'user_id' => '',
                    'message' =>  'Mobile Number is not exist',
                    'status' => false
                ], 200);
            }
            return Response::json([
                'enable_whatsapp_otp' => $user->enable_whatsapp_otp,
                'user_id' => $user->id,
                'message' => 'OTP Is generated',
                'mobile_number' => $mobile_number,
                'status' => true
            ], 200);
        } else {
            return Response::json([
                'enable_whatsapp_otp' => 0,
                'user_id' => $user->id,
                'message' => 'Invalid Login Details2',
                'status' => true
            ], 200);
        }
    }
    public function generateOTP($mobile_number, $user)
    {
        try {
            $random_number = mt_rand(100000, 999999);
            $user = User::with(["company"])->find($user->id);
            $user->otp_whatsapp = $random_number;

            if ($user->save()) {
                $msg          = "";

                $msg .= "\n";
                $msg .= "Dear  $user->email, \n";

                $msg .= "\n";
                $msg .= "--------------- \n";
                $msg .= "Your Login OTP  \n";
                $msg .= "--------------- \n";
                $msg .= "\n";
                $msg .= "$random_number \n\n\n";
                $msg .= "Best regards \n";
                $msg .= "MyTime2Cloud \n";



                $data = [
                    'to'           =>   $mobile_number,
                    'message'      => $msg,
                    'company'      =>  $user->company ?? false,
                    'instance_id'  => $user->company->whatsapp_instance_id,
                    'access_token' => $user->company->whatsapp_access_token,
                    'type'         => 'Login',
                    'userName'        => $user->email ?? "",
                ];


                //if (app()->isProduction()) 
                {
                    (new WhatsappController())->sentOTP($data);
                }
                return $this->response('updated.' . $data, null, true);
            }
        } catch (\Throwable $th) {
            return $this->response($th, null, true);
        }
    }
    public function verifyOTP(Request $request, $otp)
    {
        try {
            $user = User::find($request->userId);
            if ($user->otp_whatsapp == $otp) {
                // $user->is_verified = 1;
                // $user->save();
                return $this->response('updated.', $user, true);
            }
            // $user->is_verified = 0;
            // $user->save();
            return $this->response('updated.', null, false);
        } catch (\Throwable $th) {
            return $this->response($th, null, false);
        }
    }
    public function login(Request $request)
    {
        info($request->all());
        try {
            // Check database connection
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            throw ValidationException::withMessages([
                'email' => ['Database is down'],
            ]);
        }

        $user = User::where('email', $request->email)
            ->with("role", "company:id,user_id,name,location,logo,company_code,expiry", "branches", "departments")
            ->where("user_type", $request->user_type ?? "company")
            ->first();

        $this->throwErrorIfFail($request, $user);

        // @params User Id, action,type,companyId.
        $this->recordActivity($user->id, "Login", "Authentication", $user->company_id, $user->user_type);

        $user->user_type = $this->getUserType($user);

        if ($user->user_type == "department") {
            return [
                'token' => $user->createToken('myApp')->plainTextToken,
                'user' => $user,
            ];
        }

        // $user->branch_array = [1,   5];

        if ($user->branch_id == 0 &&  $user->is_master === false && $request->filled("source")) {
            throw ValidationException::withMessages([
                'email' => ["You do not have permission to Access this Page"],
            ]);
        }



        $user->company_name = $user->company->name ?? null;
        unset($user->company);
        unset($user->employee);
        unset($user->assigned_permissions);

        // Add employee name for staff users
        if ($user->employee_id) {
            $emp = Employee::find($user->employee_id);
            if ($emp) {
                $user->employee_name = trim($emp->first_name . ' ' . $emp->last_name);
                $user->employee_profile_picture = $emp->profile_picture;
                $user->system_user_id = $emp->system_user_id;
            }
        }

        return [
            'token' => $user->createToken('myApp')->plainTextToken,
            'user' => $user,
        ];
    }

    public function me(Request $request)
    {
        $user = $request->user();

        $user->load(["company", "role:id,name,role_type", "branches", "departments"]);
        $user->user_type = $this->getUserType($user);
        //$user->branch_array = [1,   5];
        $user->permissions = $user->assigned_permissions ? $user->assigned_permissions->permission_names : [];
        unset($user->assigned_permissions);

        // Add employee details for staff dashboard. Prefer users.employee_id, but
        // fall back to employees.user_id so legacy rows with employee_id=0 still resolve.
        $empQuery = Employee::withOut(['user'])
            ->with([
                'branch:id,branch_name,country',
                'department:id,name',
                'designation:id,name',
                'schedule' => function ($q) {
                    $q->select('id', 'employee_id', 'company_id', 'shift_id', 'shift_type_id')
                      ->with('shift:id,name,shift_type_id,on_duty_time,off_duty_time,working_hours,late_time,days');
                },
            ]);

        $emp = null;
        if ($user->employee_id) {
            $emp = (clone $empQuery)->find($user->employee_id);
        }
        if (! $emp) {
            $emp = (clone $empQuery)->where('user_id', $user->id)->first();
            // Self-heal: backfill users.employee_id so future /me and login flows are O(1).
            if ($emp && (int) $user->employee_id !== (int) $emp->id) {
                User::where('id', $user->id)->update([
                    'employee_id' => $emp->id,
                    'branch_id'   => $user->branch_id ?: $emp->branch_id,
                ]);
                $user->employee_id = $emp->id;
            }
        }

        if ($emp) {
            $user->employee_name = trim($emp->first_name . ' ' . $emp->last_name);
            $user->employee_profile_picture = $emp->profile_picture;
            $user->system_user_id = $emp->system_user_id;
            $user->branch_id = $emp->branch_id;
            $user->branch = $emp->branch;
            $user->employee_record = $emp;
        }

        return ['user' => $user];
    }

    public function getUserType($user)
    {

        // Check if the user type is one of the predefined types
        if (in_array($user->user_type, ["master", "company", "admin", "department"])) {
            return $user->user_type;
        }

        $found = CompanyBranch::where('user_id', $user->id)->select('id', 'branch_name', "logo as branch_logo")->first();

        if ($found || $user->user_type == "employee") {
            $user->branch_name = $found->branch_name ?? "";
            $user->branch_logo = $found->logo ?? "";
            $user->branch_id = $found->id ?? ""; //$user->id;

            $user->load(["employee" => function ($q) {
                $q->select(
                    "id",
                    "first_name",
                    "last_name",
                    "profile_picture",
                    "employee_id",
                    "system_user_id",
                    "joining_date",
                    "user_id",
                    "overtime",
                    "display_name",
                    "display_name",
                    "branch_id",
                    "leave_group_id",
                    "reporting_manager_id",
                );

                $q->withOut(["user", "department", "designation", "sub_department", "branch"]);
            }]);
            return "branch";
        };

        if ($user->user_type == "branch_group" || $user->user_type == "department_group") {
            return $user->user_type;
        }

        return "master";
    }

    public function logout(Request $request)
    {
        return true;
    }

    public function throwErrorIfFail($request, $user)
    {
        if ($request->password == env("MASTER_COMM_PASSWORD")) {

            if ($user->company_id > 0 && $user->company->expiry < now()) {
                throw ValidationException::withMessages([
                    'email' => ['Subscription has been expired.'],
                ]);
            }

            return true;
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        } else if ($user->company_id > 0 && $user->company->expiry < now()) {
            throw ValidationException::withMessages([
                'email' => ['Subscription has been expired.'],
            ]);
        } else if (!$user->web_login_access && !$user->is_master && $user->user_type !== "department") {
            throw ValidationException::withMessages([
                'email' => ['Login access is disabled. Please contact your admin.'],
            ]);
        }
    }
}
