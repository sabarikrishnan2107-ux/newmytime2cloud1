<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    public function index()
    {
        return User::with("company", "role")
            ->where("company_id", request("company_id", 0))
            ->where("user_type", "admin")
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
            'order' => 'required|numeric',
            'company_id' => 'required',
            'branch_id' => 'nullable',
        ]);

        $userData = [
            "name" => $validatedData['name'],
            "email" => $validatedData['email'],
            "password" => Hash::make($validatedData['password']),
            "role_id" => $validatedData['role_id'],
            "company_id" => $validatedData['company_id'],
            "branch_id" => $validatedData['branch_id'],
            "is_master" => 1,
            "first_login" => 1,
            "user_type" => "admin",
            "order" => $validatedData['order'] ?? 0,
        ];

        try {
            $user = User::updateOrCreate(
                ['email' => $validatedData['email']], // Condition to find an existing record
                $userData // Data to update or insert
            );

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
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:8|confirmed', // make password nullable
            'order' => 'required|numeric',
            'role_id' => 'required|numeric',
            'branch_id' => 'nullable',
        ]);

        // Build admin array
        $admin = [
            "name" => $validatedData['name'],
            "email" => $validatedData['email'],
            "order" => $validatedData['order'],
            "role_id" => $validatedData['role_id'],
            "branch_id" => $validatedData['branch_id'],
        ];

        // Only set password if it is provided
        if (!empty($validatedData['password'])) {
            $admin['password'] = Hash::make($validatedData['password']);
        }

        try {
            return User::where("id", $id)->update($admin);
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
