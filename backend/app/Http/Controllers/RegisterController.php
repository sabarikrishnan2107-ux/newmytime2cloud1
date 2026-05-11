<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RegisterController extends Controller
{
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
        ]);
        try {
            DB::beginTransaction();

            $data = $validatedData;

            $company = [
                "name" => "Your Company Name",
                "member_from" => date('Y-m-d H:i:s'),
                "expiry" => date('Y-m-d H:i:s', strtotime(date("Y-m-d") . ' +3 months')),
                "company_code" => Company::max('id') + 1,
                "max_employee" => 100,
                "max_devices" => 1,
                "account_type" => "company",
                "wizard_mode" => true,
            ];

            $company = Company::create($company);

            if (!$company) {
                DB::rollBack();
                return $this->response('Company cannot add.', null, false);
            }

            $user = [
                "name" => "ignore",
                "email" => $data['email'],
                "password" => Hash::make($data['password']),
                "is_master" => 1,
                "first_login" => 1,
                "user_type" => "company",
                "company_id" => $company->id,
            ];

            $role = Role::firstOrCreate(['name' => 'company']);

            if (!$role) {
                return $this->response('Role cannot add.', null, false);
            }

            $user["role_id"] = $role->id;

            $user = User::create($user);

            if (!$user) {
                DB::rollBack();
                return $this->response('User cannot add.', null, false);
            }


            $company->user_id = $user->id;
            $company->save();
            DB::commit();

            return $this->response('Company Successfully created.', $company, true);
        } catch (\Throwable $th) {
            DB::rollBack();
            return $th;
            return $this->response('Company cannot create.', null, true);
        }
    }
}
