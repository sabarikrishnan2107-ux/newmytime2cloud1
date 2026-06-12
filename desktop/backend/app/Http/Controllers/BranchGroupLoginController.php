<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class BranchGroupLoginController extends Controller
{
    public function index()
    {
        return User::with("company", "role", "branches")
            ->where("company_id", request("company_id", 0))
            ->where("user_type", "branch_group")
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
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'numeric|exists:company_branches,id',
        ]);

        $userData = [
            "name" => $validatedData['name'],
            "email" => $validatedData['email'],
            "password" => Hash::make($validatedData['password']),
            "role_id" => $validatedData['role_id'],
            "company_id" => $validatedData['company_id'],
            "is_master" => 1,
            "first_login" => 1,
            "user_type" => "branch_group",
        ];

        try {
            $user = User::updateOrCreate(
                ['email' => $validatedData['email']], // Condition to find an existing record
                $userData // Data to update or insert
            );

            if (!empty($validatedData['branch_ids'])) {
                $user->branches()->sync($validatedData['branch_ids']);
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
            'name'        => 'required|string|max:255',
            'email'       => 'required|string|email|max:255|unique:users,email,' . $id,
            'password'    => 'nullable|string|min:8|confirmed',
            'role_id'     => 'required|numeric',
            'company_id'  => 'required',
            'branch_ids'  => 'nullable|array',
            'branch_ids.*' => 'numeric|exists:company_branches,id',
        ]);

        // Prepare data to update
        $updateData = [
            "name"       => $validatedData['name'],
            "email"      => $validatedData['email'],
            "role_id"    => $validatedData['role_id'],
        ];

        // Only update password if provided
        if (!empty($validatedData['password'])) {
            $updateData['password'] = Hash::make($validatedData['password']);
        }

        try {
            // Update user
            $user->update($updateData);

            // Sync branches if provided
            if (isset($validatedData['branch_ids'])) {
                $user->branches()->sync($validatedData['branch_ids']);
            }

            return response()->json([
                "message" => "User updated successfully",
                "data" => $user->load('branches')
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
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
