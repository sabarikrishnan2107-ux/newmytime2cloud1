<?php

namespace App\Http\Controllers;

use App\Http\Requests\Company\CompanyRequest;
use App\Http\Requests\Company\CompanyUpdateRequest;
use App\Http\Requests\Company\ContactRequest;
use App\Http\Requests\Company\GeographicUpdateRequest;
use App\Http\Requests\Company\StoreRequest;
use App\Http\Requests\Company\UserRequest;
use App\Http\Requests\Company\UserUpdateRequest;
use App\Mail\NotifyIfLogsDoesNotGenerate;
use App\Models\AnnouncementsCategories;
use App\Models\AssignModule;
use App\Models\AttendanceLog;
use App\Models\Branch;
use App\Models\Company;
use App\Models\CompanyBranch;
use App\Models\CompanyContact;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Device;
use App\Models\Employee;
use App\Models\MailContent;
use App\Models\Role;
use App\Models\Theme;
use App\Models\User;
use App\Models\VisitorLog;
use App\Notifications\CompanyCreationNotification;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log as Logger;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;
use TechTailor\RPG\Facade\RPG;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CompanyController extends Controller
{
    public function validateCompany(CompanyRequest $request)
    {
        return ["status" => true, "company_payload" => $request->validated()];
    }

    public function validateContact(ContactRequest $request)
    {
        return ["status" => true, "contact_payload" => $request->validated()];
    }

    public function validateCompanyUser(UserRequest $request)
    {
        return ["status" => true, "user_payload" => $request->validated()];
    }

    public function validateCompanyUserUpdate(UserUpdateRequest $request)
    {
        return ["status" => true];
    }

    public function CompanyList(Company $Company)
    {
        return $Company->select('id', 'name', 'company_code')->orderBy("name", "asc")->get();
    }

    public function index(Company $model, Request $request)
    {
        return $model->where("account_type", "company")->with(['user', 'contact', 'modules', 'trade_license'])->withCount('employees')->paginate($request->per_page);
    }

    public function getMasterDashboardCounts()
    {
        $companiesCount = Company::query()->count();
        $empCount       = Employee::query()->count();

        return ["companies" => $companiesCount, "employees" => $empCount];
    }
    public function show($id): JsonResponse
    {
        $record = Company::with(['user', 'contact', 'modules', 'trade_license'])->withCount('employees')->where('id', $id)->first();

        return Response::json([
            'record'  => $record,
            'status'  => true,
            'message' => null,
        ], 200);
    }

    public function store(StoreRequest $request)
    {
        $randPass = RPG::Generate("luds", 8, 0, 0);

        if (env("APP_ENV") == "local") {
            Storage::put('password.txt', $randPass);
        }

        $data = $request->validated();
        $user = [
            "name"        => "ignore",
            "password"    => Hash::make($randPass),
            "email"       => $data['email'],
            "is_master"   => 1,
            "first_login" => 1,
            "user_type"   => "company",
        ];

        $company = [
            "name"         => $data['company_name'],
            "location"     => $data['location'],
            "member_from"  => $data['member_from'],
            "expiry"       => $data['expiry'],
            "max_employee" => $data['max_employee'],
            "max_devices"  => $data['max_devices'],
            "company_code" => Company::max('id') + 1,

            "no_branch"    => $request->no_branch ? 1 : 0,
            "max_branches" => $request->max_branches ? 1 : 0,
            "lat"          => $request->lat,
            "lon"          => $request->lon,
            "wizard_mode"  => true,
        ];

        if (isset($request->logo)) {

            $file     = $request->file('logo');
            $ext      = $file->getClientOriginalExtension();
            $fileName = time() . '.' . $ext;
            $request->file('logo')->move(public_path('/upload'), $fileName);
            $company['logo'] = $fileName;
        }

        $contact = [
            "name"     => $data['contact_name'],
            "number"   => $data['number'],
            "position" => $data['position'],
            "whatsapp" => $data['whatsapp'],
        ];

        DB::beginTransaction();

        try {
            $role = Role::firstOrCreate(['name' => 'company']);

            if (! $role) {
                return $this->response('Role cannot add.', null, false);
            }

            $user["role_id"] = $role->id;

            if (! $user) {
                return $this->response('User cannot add.', null, false);
            }

            $company = Company::create($company);

            $user["company_id"] = $company->id;
            $user               = User::create($user);

            $company->user_id = $user->id;
            $company->save();

            $user['randPass'] = $randPass;
            try {
                if (($company && $user) && env('IS_MAIL')) {
                    NotificationsController::toSend($user, new CompanyCreationNotification, $company);
                }
            } catch (Exception $e) {
            }
            if (! $company) {
                return $this->response('Company cannot add.', null, false);
            }

            $contact['company_id'] = $company->id;

            $contact = CompanyContact::create($contact);

            if (! $contact) {
                return $this->response('Contact cannot add.', null, false);
            }

            $company->logo = asset('media/company/logo' . $company->logo);

            DB::commit();

            $record       = Company::with(['user', 'contact'])->find($company->id);
            $record->pass = $randPass;

            // if (! $this->addDefaults($company->id)) {
            //     return $this->response('Default cannot add.', null, false);
            // }

            return $this->response('Company Successfully created.', $record, true);
        } catch (\Throwable $th) {
            DB::rollBack();
            throw $th;
        }
    }

    public function addDefaults($id)
    {
        $cardData = defaultCards($id);
        $style    = $cardData['style'];
        unset($cardData['style']);

        Theme::where($cardData)->delete();

        $cardData["style"] = $style;

        $theme = Theme::create($cardData);
        $role  = Role::insert(defaultRoles($id));

        $designations            = Designation::insert(defaultDesignations($id));
        $AnnouncementsCategories = AnnouncementsCategories::insert(defaultAnnouncementCategories($id));
        $MailContent             = MailContent::insert(defaultMailContent($id));

        $devices    = Device::insert(defaultDeviceManual($id));
        $branches   = CompanyBranch::create(defaultBranch($id));
        $department = Department::insert(defaultDepartments($id, $branches->id));

        if ($theme && $role && $department) {
            return true;
        }

        return false;
    }

    public function destroy($id)
    {
        try {
            // Find the company (may not exist)
            $company = Company::find($id);

            // Delete related records safely
            Employee::where('company_id', $id)->delete();
            CompanyContact::where('company_id', $id)->delete();
            AssignModule::where('company_id', $id)->delete();
            User::where('company_id', $id)->delete();

            // Delete company owner if exists
            if ($company) {
                $owner = User::find($company->user_id);
                $owner?->delete();

                $company->delete();
            }

            return response()->noContent(204);
        } catch (\Exception $e) {
            // Return a 500 response
            return response()->json([
                'message' => 'Failed to delete the company. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function search(Company $model, Request $request, $key)
    {
        $model = $this->FilterCompanyList($model, $request, class_basename($model));

        $fields = [
            'name',
            'location',
            'contact' => ['name', 'number', 'position', 'whatsapp'],
            'user'    => ['name', 'email'],
        ];

        $model = $this->process_search($model, $key, $fields);

        $model->with(['user', 'contact', 'modules', 'trade_license']);

        $model->withCount('employees');

        $model->orderByDesc('id');

        return $model->paginate($request->per_page);
    }

    public function branches(Request $request, $id)
    {
        return Branch::where('company_id', $id)->with(['user', 'contact'])->orderByDesc('id')->paginate($request->perPage);
    }

    public function devices(Request $request, $id)
    {
        return Device::where('company_id', $id)->with(['status'])->orderByDesc('id')->paginate(100);
    }

    public function update_log($request, $id)
    {
        $file     = $request->file('logo');
        $ext      = $file->getClientOriginalExtension();
        $fileName = time() . '.' . $ext;
        $request->file('logo')->move(public_path('/upload'), $fileName);
        $company = Company::find($id)->update(["logo" => $fileName]);
        if (! $company) {
            return $this->response('Company cannot updated.', null, false);
        }
        return $this->response('Logo successfully updated.', $company, true);
    }

    public function updateCompany(CompanyUpdateRequest $request, $id)
    {

        $data = $request->validated();
        $companyRecord = Company::findOrFail($id);

        if ($request->logo_only == 1) {
            return $this->update_log($request, $id);
        }

        if ($request->has('no_branch')) {
            $data["no_branch"] = $request->no_branch ? 1 : 0;
        }

        if ($request->filled('max_branches')) {
            $data["max_branches"] = (int) $request->max_branches;
        }

        // $data["lat"] = $request->lat;
        // $data["lon"] = $request->lon;
        $data["name"] = $request->name;

        if ($request->email != '') {
            $dataUser["email"] = $request->email;
            $user              = User::find(Company::find($id)->user_id);
            $user->update($dataUser);
        }

        if (isset($request->logo)) {
            $file     = $request->file('logo');
            $ext      = $file->getClientOriginalExtension();
            $fileName = time() . '.' . $ext;
            $request->file('logo')->move(public_path('/upload'), $fileName);
            $data['logo'] = $fileName;
        }

        unset($data['email']);

        $company = $companyRecord->update($data);
        if (! $company) {
            return $this->response('Company cannot updated.', null, false);
        }

        return $this->response('Company successfully updated.', $company, true);
    }

    public function updateContact(ContactRequest $request, $id)
    {
        $contact = CompanyContact::where('company_id', $id)->update($request->validated());

        if (! $contact) {
            return $this->response('Contact cannot updated.', null, false);
        }

        return $this->response('Contact successfully updated.', $contact, true);
    }

    public function updateCompanyGeographic(GeographicUpdateRequest $request, $id)
    {
        $geographic = Company::find($id)->update($request->validated());

        if (! $geographic) {
            return $this->response('Geographic Info cannot updated.', null, false);
        }

        return $this->response('Geographic Info successfully updated.', $geographic, true);
    }
    public function updateCompanyUserWhatsapp(Request $request, $id)
    {

        $user    = User::find(Company::find($id)->user_id);
        $company = Company::find($id);
        $arr     = [

            "enable_whatsapp_otp" => $request->enable_whatsapp_otp ? 1 : 0,
        ];

        $record = $company->update($arr);
        $record = $user->update($arr);

        if (! $record) {
            return $this->response('User cannot update.', null, false);
        }
        return $this->response('User successfully updated.', $record, true);
    }

    public function updateCompanyWhatsappSettings(Request $request, $id)
    {

        $company = Company::find($id);

        $arr = [

            "enable_whatsapp_otp"     => $request->enable_whatsapp_otp ? 1 : 0,
            "whatsapp_instance_id"    => $request->whatsapp_instance_id,
            "whatsapp_access_token"   => $request->whatsapp_access_token,
            "enable_desktop_whatsapp" => $request->enable_desktop_whatsapp,
        ];

        $record = $company->update($arr);

        if (! $record) {
            return $this->response('Company cannot update.', null, false);
        }
        return $this->response('Company successfully updated.', $record, true);
    }

    public function updateCompanyModulesSettings(Request $request, $id)
    {

        if ($request->filled("modules")) {

            $arr = [

                "display_modules" => $request->modules,

            ];

            $record = Company::whereId($id)->update($arr);

            if (! $record) {
                return $this->response('Company cannot update.', null, false);
            }
            return $this->response('Company successfully updated.', $record, true);
        }
        return $this->response('Company cannot update.', null, false);
    }

    public function updateCompanyUser(UserUpdateRequest $request, $id)
    {
        $data = $request->validated();
        $user = User::find(Company::find($id)->user_id);

        $arr = [
            "password"            => Hash::make($data["password"]),
            "first_login"         => 0,
            "enable_whatsapp_otp" => $request->enable_whatsapp_otp ? 1 : 0,
        ];
        if ($request->current_password != '') {
            if (Hash::check($request->current_password, $user->password)) {
                $record = $user->update($arr);
                if (! $record) {
                    return $this->response('User cannot update.', null, false);
                }
                return $this->response('User successfully updated.', $record, true);
            } else {
                return [
                    "status" => false,
                    "errors" => ['current_password' => 'Current password does not match'],
                ];
            }
        } else {
            $record = $user->update($arr);
            if (! $record) {
                return $this->response('User cannot update.', null, false);
            }
            return $this->response('User successfully updated.', $record, true);
        }
    }

    public function UpdateCompanyIds_old()
    {
        $date = date("Y-m-d H:i:s");

        $model = AttendanceLog::query();
        $model->distinct('DeviceID');
        $model->where("company_id", 0);

        $model->whereHas('device', function ($query) {
            $query->where('company_id', '!=', 0);
        });

        $model->take(10);
        $model->with("device:device_id,company_id,location,device_type");
        $rows = $model->get(["DeviceID"]);

        if (count($rows) == 0) {
            return "[" . $date . "] Cron: UpdateCompanyIds. No new record found while updating company ids for device.\n";
        }

        $i = 0;

        foreach ($rows as $arr) {
            try {
                $i++;

                AttendanceLog::where("DeviceID", $arr["DeviceID"])->where("company_id", 0)
                    ->update([
                        "company_id"   => $arr["device"]["company_id"] ?? 0,
                        "gps_location" => $arr["device"]["location"] ?? null,
                    ]);
            } catch (\Throwable $th) {
                Logger::channel("custom")->error('Cron: UpdateCompanyIds. Error Details: ' . $th);
            }
        }

        return "[" . $date . "] Cron: UpdateCompanyIds. $i Logs has been Process.\n"; //."Details: " . json_encode($result) . ".\n";

    }

    public function UpdateCompanyIds()
    {
        $date = now();

        // Step 1: Get 10 distinct DeviceIDs with related device info
        $rows = AttendanceLog::query()
            ->select('DeviceID')
            ->where("company_id", 0)
            ->whereHas('device', function ($query) {
                $query->where('company_id', '!=', 0);
            })
            ->with(['device:id,device_id,company_id,location'])
            ->distinct()
            ->take(10)
            ->get();

        if ($rows->isEmpty()) {
            return "[$date] Cron: UpdateCompanyIds. No new record found while updating company ids for device.\n";
        }

        $i = 0;

        foreach ($rows as $log) {
            if (! $log->device) {
                continue;
            }

            try {
                $i++;

                AttendanceLog::where("DeviceID", $log->DeviceID)
                    ->where("company_id", 0)
                    ->update([
                        "company_id"   => $log->device->company_id,
                        "gps_location" => $log->device->location,
                    ]);
            } catch (\Throwable $th) {
                Logger::channel('custom')->error('Cron: UpdateCompanyIds. Error Details: ' . $th->getMessage());
            }
        }

        return "[$date] Cron: UpdateCompanyIds. $i Logs have been processed.\n";
    }

    public function UpdateCompanyIdsForVisitor()
    {
        $date = date("Y-m-d H:i:s");

        $model = VisitorLog::query();
        $model->distinct('DeviceID');
        $model->where("company_id", 0);
        $model->take(1000);
        $model->with("device:device_id,company_id");
        $rows = $model->get(["DeviceID"]);

        if (count($rows) == 0) {
            return "[" . $date . "] Cron: UpdateCompanyIds. No new record found while updating company ids for device.\n";
        }

        $i = 0;

        foreach ($rows as $arr) {

            if ($arr["device"]) {
                try {
                    $i++;
                    VisitorLog::where("DeviceID", $arr["DeviceID"])->update(["company_id" => $arr["device"]["company_id"] ?? 0]);
                } catch (\Throwable $th) {
                    Logger::channel("custom")->error('Cron: UpdateCompanyIds. Error Details: ' . $th);

                    $data = [
                        'title' => 'Quick action required',
                        'body'  => $th,
                    ];

                    Mail::to(env("ADMIN_MAIL_RECEIVERS"))->send(new NotifyIfLogsDoesNotGenerate($data));
                    return "[" . $date . "] Cron: UpdateCompanyIds. Error occured while updating company ids.\n";
                }
            }
        }

        return "[" . $date . "] Cron: UpdateCompanyIds. $i Logs has been merged with Company IDS.\n"; //."Details: " . json_encode($result) . ".\n";

    }
    public function shortInfo($id)
    {
        $company = Company::with("user:id,company_id,email")->find($id);

        if (! $company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        return $company;
    }

    public function contactInfo($id)
    {
        $contact = CompanyContact::whereCompanyId($id)->find($id);

        if (! $contact) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        return $contact;
    }

    public function getWizardMode($id)
    {
        $company = Company::find($id);
        if (! $company) {
            return response()->json(['error' => 'Company not found'], 404);
        }
        return response()->json(['wizard_mode' => (bool) $company->wizard_mode]);
    }

    public function setWizardMode(Request $request, $id)
    {
        $validated = $request->validate([
            'wizard_mode' => 'required|boolean',
        ]);
        $company = Company::find($id);
        if (! $company) {
            return response()->json(['error' => 'Company not found'], 404);
        }
        $company->wizard_mode = $validated['wizard_mode'];
        $company->save();
        return response()->json(['wizard_mode' => (bool) $company->wizard_mode]);
    }

    public function checkPin(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'device_id' => 'required|string',
                'pin'       => 'required|digits:4',
            ]);

            $exists = Device::where('device_id', $validated['device_id'])
                ->where('door_pin', $validated['pin'])
                ->exists();

            return response()->json(['status' => $exists]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status' => false,
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => false,
                'message' => 'Something went wrong: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function updateLogoOnly(Request $request)
    {
        try {

            $company = Company::findOrFail($request->company_id);

            // 2. Validate incoming data
            $validatedData = $request->validate([
                'logo_base_64' => 'nullable|string', // Con
            ]);

            $dataToUpdate = $validatedData;
            $imagePath    = null;

            // 3. Handle Base64 Image if provided
            if (! empty($validatedData['logo_base_64'])) {
                $base64Image = $validatedData['logo_base_64'];

                // Separate MIME and data
                if (Str::startsWith($base64Image, 'data:')) {
                    list($type, $base64Image) = explode(';', $base64Image);
                    list(, $base64Image)      = explode(',', $base64Image);
                }

                $imageData = base64_decode($base64Image);

                $ext = '.png';
                if (isset($type) && str_contains($type, 'jpeg')) {
                    $ext = '.jpg';
                }

                $fileName  = time() . '_' . Str::random(10) . $ext;
                $targetDir = public_path('upload/');

                if (! is_dir($targetDir)) {
                    mkdir($targetDir, 0777, true);
                }

                $imagePath = $targetDir . $fileName;
                file_put_contents($imagePath, $imageData);

                // Delete old image if exists
                if ($company->profile_picture && file_exists($targetDir . $company->profile_picture)) {
                    unlink($targetDir . $company->profile_picture);
                }

                $dataToUpdate['logo'] = $fileName;
            }

            unset($dataToUpdate['logo_base_64']);

            // 4. Update the record
            $company->update($dataToUpdate);

            // 5. Return success response
            return response()->json([
                'message'  => 'Company updated successfully!',
                'company' => $company,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Company not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the company.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function getLogoOnly($id)
    {
        try {

            $company = Company::findOrFail($id);

            return $company->logo ?? null;
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Company not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the company.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
