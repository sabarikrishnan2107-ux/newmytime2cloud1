<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ManagerLoginController extends Controller
{
    public function index(Employee $employee, Request $request)
    {
        return User::where("company_id", $request->company_id)
            ->where("user_type", "manager")
            ->whereHas("login_employee")
            ->with(["branches", "departments", "role", "login_employee:id,first_name,last_name,employee_id,system_user_id,profile_picture,phone_number,department_id"])
            ->paginate($request->per_page ?? 100);
        return $employee->filterV1($request)
            ->paginate($request->per_page ?? 100);
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email',
            'password' => 'required|string|min:8|confirmed',
            'role_id' => 'required|numeric',
            'company_id' => 'required',
            'department_ids' => 'nullable|array', // validate as array
            'department_ids.*' => 'numeric|exists:departments,id', // each ID should exist
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'numeric|exists:company_branches,id',

            'notify' => 'nullable',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',

            'employee_id' => 'required|numeric'
        ]);

        $userData = [
            "name" => $validatedData['name'],
            "email" => $validatedData['email'],
            "password" => Hash::make($validatedData['password']),
            "role_id" => $validatedData['role_id'],
            "company_id" => $validatedData['company_id'],
            "is_master" => 1,
            "first_login" => 1,
            "user_type" => "manager",

            "notify"    => $validatedData['notify'] ?? 0,
            "start_date" => $validatedData['start_date'],
            "end_date" => $validatedData['end_date'],

            "employee_id" => $validatedData['employee_id'],

        ];

        try {
            $user = User::updateOrCreate(
                ['email' => $validatedData['email']],
                $userData
            );

            if (!empty($validatedData['branch_ids'])) {
                $user->branches()->sync($validatedData['branch_ids']);
            }

            // Sync departments if provided
            if (!empty($validatedData['department_ids'])) {
                $user->departments()->sync($validatedData['department_ids']);
            }


            return $user;
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validatedData = $request->validate([

            'name' => 'required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:8|confirmed',
            'role_id' => 'required|numeric',
            'company_id' => 'required',
            'department_ids' => 'nullable|array', // validate as array
            'department_ids.*' => 'numeric|exists:departments,id', // each ID should exist
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'numeric|exists:company_branches,id',

            'notify' => 'nullable',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',

            'employee_id' => 'required|numeric'
        ]);


        if (!empty($validatedData['password'])) {
            $validatedData['password'] = Hash::make($validatedData['password']);
        } else {
            unset($validatedData['password']);
        }

        try {

            $user->update($validatedData);
            $user->branches()->sync($request->input('branch_ids', []));
            $user->departments()->sync($request->input('department_ids', []));

            return response()->json([
                "message" => "Login updated successfully",
                "data" => $user->load('branches')
            ], 200);
        } catch (\Exception $e) {
            return $e->getMessage();
        }
    }

    public function show($id)
    {
        return User::with("company")->find($id);
    }

    public function destroy($id)
    {
        try {

            User::find($id)->delete();

            return response()->noContent();
        } catch (\Exception $e) {

            return $e->getMessage();
        }
    }
}
