<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DepartmentGroupLoginController extends Controller
{
    public function index()
    {
        return User::with("company", "role", "departments")
            ->where("company_id", request("company_id", 0))
            ->where("user_type", "department_group")
            ->orderBy("id", "desc")
            ->paginate(request("per_page", 15));
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users|max:255',
            'password' => 'required|string|min:8|confirmed',
            'role_id' => 'required|numeric',
            'company_id' => 'required',
            'department_ids' => 'nullable|array', // validate as array
            'department_ids.*' => 'numeric|exists:departments,id', // each ID should exist
        ]);

        $userData = [
            "name" => $validatedData['name'],
            "email" => $validatedData['email'],
            "password" => Hash::make($validatedData['password']),
            "role_id" => $validatedData['role_id'],
            "company_id" => $validatedData['company_id'],
            "is_master" => 1,
            "first_login" => 1,
            "user_type" => "department_group",
        ];

        try {
            $user = User::updateOrCreate(
                ['email' => $validatedData['email']], // Condition to find an existing record
                $userData // Data to update or insert
            );

            // Sync departments if provided
            if (!empty($validatedData['department_ids'])) {
                // Assuming User has a many-to-many relation with Department
                $user->departments()->sync($validatedData['department_ids']);
            }


            return $user;
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        return User::with("company")->find($id);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:8|confirmed', // make password nullable
            'role_id' => 'required|numeric',
            'department_ids' => 'nullable|array', // validate as array
            'department_ids.*' => 'numeric|exists:departments,id', // each ID should exist
        ]);

        // Build admin array
        $admin = [
            "name" => $validatedData['name'],
            "email" => $validatedData['email'],
            "role_id" => $validatedData['role_id'],
        ];

        // Only set password if it is provided
        if (!empty($validatedData['password'])) {
            $admin['password'] = Hash::make($validatedData['password']);
        }

        try {

            $user->update($admin);

            // Sync branches if provided
            if (isset($validatedData['department_ids'])) {
                $user->departments()->sync($validatedData['department_ids']);
            }

            return response()->json([
                "message" => "Login updated successfully",
                "data" => $user->load('branches')
            ], 200);
        } catch (\Exception $e) {
            return $e->getMessage();
        }
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
