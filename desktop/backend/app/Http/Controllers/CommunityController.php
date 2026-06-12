<?php

namespace App\Http\Controllers;

use App\Http\Requests\Community\InfoRequest;
use App\Http\Requests\Community\StoreRequest;
use App\Models\AnnouncementsCategories;
use App\Models\Company;
use App\Models\CompanyContact;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Device;
use App\Models\MailContent;
use App\Models\Role;
use App\Models\Theme;
use App\Models\User;
use App\Notifications\CompanyCreationNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use TechTailor\RPG\Facade\RPG;

class CommunityController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return Company::where("account_type", "community")->with(['user', 'contact'])->paginate(request("per_page") ?? 10);
    }

    public function validateCommunity(InfoRequest $request)
    {
        try {
            return $this->response('Tanent Successfully created.', $request->validated(), true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function store(StoreRequest $request)
    {
        $randPass = RPG::Generate("luds", 8, 0, 0);

        if (env("APP_ENV") == "local") {
            Storage::put('password.txt', $randPass);
        }

        $data = $request->validated();
        $user = [
            "name" => "ignore",
            "password" => Hash::make($randPass),
            "email" => $data['email'],
            "is_master" => 1,
            "first_login" => 1,
            "user_type" => "company",
        ];

        $company = [
            "name" => $data['company_name'],
            "location" => $data['location'],
            "member_from" => $data['member_from'],
            "expiry" => $data['expiry'],
            "company_code" => Company::max('id') + 1,
            "no_branch" => 0,
            "max_employee" => 0,
            "max_devices" => 0,

            "lat" => $request->lat,
            "lon" => $request->lon,

            "management_company" => $data['management_company'],
            "account_type" => "community",
            "wizard_mode" => true,

        ];

        if (isset($request->logo)) {

            $file = $request->file('logo');
            $ext = $file->getClientOriginalExtension();
            $fileName = time() . '.' . $ext;
            $request->file('logo')->move(public_path('/upload'), $fileName);
            $company['logo'] = $fileName;
        }

        $contact = [
            "name" => $data['contact_name'],
            "number" => $data['number'],
            "position" => $data['position'],
            "whatsapp" => $data['whatsapp'],
        ];

        DB::beginTransaction();

        try {
            $role = Role::firstOrCreate(['name' => 'company']);

            if (!$role) {
                return $this->response('Role cannot add.', null, false);
            }

            $user["role_id"] = $role->id;

            if (!$user) {
                return $this->response('User cannot add.', null, false);
            }

            $company = Company::create($company);

            $user["company_id"] = $company->id;
            $user = User::create($user);

            $company->user_id = $user->id;
            $company->save();

            $user['randPass'] = $randPass;
            try {
                if (($company && $user) && env('IS_MAIL')) {
                    NotificationsController::toSend($user, new CompanyCreationNotification, $company);
                }
            } catch (\Exception $e) {
                return $e;
            }
            if (!$company) {
                return $this->response('Company cannot add.', null, false);
            }

            $contact['company_id'] = $company->id;

            $contact = CompanyContact::create($contact);

            if (!$contact) {
                return $this->response('Contact cannot add.', null, false);
            }

            $company->logo = asset('media/company/logo' . $company->logo);

            DB::commit();

            $record = Company::with(['user', 'contact'])->find($company->id);
            $record->pass = $randPass;

            if (!$this->addDefaults($company->id)) {
                return $this->response('Default cannot add.', null, false);
            }

            return $this->response('Company Successfully created.', $record, true);
        } catch (\Throwable $th) {
            DB::rollBack();
            throw $th;
        }
    }

    public function communityDelete($id)
    {
        $Company = Company::find($id);

        try {
            if ($Company->update(["status" => 0])) {
                return $this->response('Company successfully deleted.', null, true);
            } else {
                return $this->response('Company cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function addDefaults($id)
    {
        $role = Role::insert(defaultRoles($id));
        $department = Department::insert(defaultDepartments($id));
        $designation = Designation::insert(defaultDesignations($id));
        $AnnouncementsCategories = AnnouncementsCategories::insert(defaultAnnouncementCategories($id));
        $MailContent = MailContent::insert(defaultMailContent($id));
        $device = Device::insert(defaultDeviceManual($id));
        return $role && $department && $designation && $AnnouncementsCategories && $MailContent && $device;
    }
}
