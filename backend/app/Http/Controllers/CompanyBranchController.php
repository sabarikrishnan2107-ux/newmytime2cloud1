<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Builder;
use App\Http\Requests\CompanyBranch\StoreRequest;
use App\Models\Company;
use App\Models\CompanyBranch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\ReverseGeocodeService;
use Illuminate\Support\Facades\Schema;

class CompanyBranchController extends Controller
{
    public function dropdownList()
    {
        $model = CompanyBranch::query();
        $model->where('company_id', request('company_id'));
        if (request("branch_id")) {
            $model->where('id', request('branch_id'));
        }

        $model->when(request()->filled("branch_ids"), function ($q) {
            $q->whereIn('id', request("branch_ids"));
        });

        $model->orderBy(request('order_by') ?? "id", request('sort_by_desc') ? "desc" : "asc");
        return $model->get(["id", "branch_name as name", "country", "timezone"]);
    }

    public function branchListGeoFencing($id)
    {
        return CompanyBranch::orderBy("branch_name", "asc")
         ->where('company_id', $id)
         ->where('geofence_enabled', true)
         ->withCount('employees')
         ->get();
    }


    public function seedDefaultData()
    {
        $arr = [];
        foreach (range(1, 5) as $i) {
            $arr[] = [
                "branch_code" => "NAM" . $i,
                "branch_name" => "BRANCH NAME " . $i,
                "created_date" => "13 Sep 2023",
                'location' => "khalid street",
                'address' => "Ajman",
                'licence_issue_by_department' => "Ajman Economic Department",
                'licence_number' => "0098765",
                'licence_expiry' => "24/09/2024",
                'telephone' => "0554501483",
                'po_box' => "654789",
                'phone' => "0554501483",
                "user_id" => 0,
                "company_id" => 8,
            ];
        }
        CompanyBranch::truncate();
        CompanyBranch::insert($arr);
        return CompanyBranch::count();
    }
    public function branchesList(Request $request)
    {
        $model = CompanyBranch::where('company_id', $request->company_id);

        $model->when($request->filled("branch_id"), function ($q) use ($request) {
            return $q->where("id", $request->branch_id);
        });

        $model->when(request()->filled("branch_ids"), function ($q) {
            $q->whereIn('id', request("branch_ids"));
        });

        $model->when($request->filled("filter_branch_id"), function ($q) use ($request) {
            return $q->where("id", $request->filter_branch_id);
        });

        $model->when($request->user_type == "department", function ($q) use ($request) {
            $q->whereHas("department", fn($qu) => $qu->where("id", $request->department_id));
        });


        return $model->orderBy('branch_name', 'asc')->get();
    }
    public function store(CompanyBranch $model, StoreRequest $request)
    {
        $data = $request->validated();
        $data["created_date"] = date("Y-m-d");
        // $data["branch_code"] = strtoupper(substr($data["branch_name"], 0, 3)) . CompanyBranch::where("company_id", $request->company_id)->orderBy("id", "desc")->value("id") ?? 0;

        $company = Company::withCount('companybranches')->find($request->company_id);
        $totalBranches = $company->companybranches_count ?? 0;
        $max_branches = $company->max_branches ?? 0;
        $remainingEmployee =  (int) $max_branches - (int) $totalBranches;

        if ($remainingEmployee <= 0) {

            return $this->response("Branch limit exceeded. Maximum limit is " . $max_branches, null, false);
        }

        // Auto-detect country and timezone from latitude/longitude
        if (!empty($data['lat']) && !empty($data['lon'])) {
            $geoService = new ReverseGeocodeService();
            
            // Auto-detect country if not provided
            if (empty($data['country'])) {
                $country = $geoService->getCountryCode($data['lat'], $data['lon']);
                if ($country) {
                    $data['country'] = $country;
                    \Log::info("✅ Auto-detected country: $country for branch: " . $data['branch_name']);
                }
            }
            
            // Auto-detect timezone if not provided
            if (empty($data['timezone'])) {
                $timezone = $geoService->getTimezone($data['lat'], $data['lon']);
                if ($timezone) {
                    $data['timezone'] = $timezone;
                    \Log::info("✅ Auto-detected timezone: $timezone for branch: " . $data['branch_name']);
                }
            }
        }

        if (isset($request->logo)) {
            $file = $request->file('logo');
            $ext = $file->getClientOriginalExtension();
            $fileName = time() . '.' . $ext;
            $request->file('logo')->move(public_path('/upload'), $fileName);
            $data['logo'] = $fileName;
        }

        try {
            $record = $model->create($data);

            if ($record) {
                return $this->response('Branch successfully added.', null, true);
            } else {
                return $this->response('Branch cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function update(CompanyBranch $model, StoreRequest $request, $id)
    {
        $data = $request->validated();

        // Auto-detect country/timezone from lat/lon — optional, runs only if enabled.
        // Enable by setting GEOCODE_ON_UPDATE=true in .env. Disabled by default because
        // external APIs (Nominatim, TimezoneDB) can hang and cause 500s on slow networks.
        if (env('GEOCODE_ON_UPDATE', false)
            && !empty($data['lat']) && !empty($data['lon'])
            && $data['lat'] !== 'undefined' && $data['lon'] !== 'undefined') {
            try {
                $existing = CompanyBranch::find($id);
                $coordsChanged = $existing && ($existing->lat != $data['lat'] || $existing->lon != $data['lon']);

                $geoService = new ReverseGeocodeService();

                if ($coordsChanged || empty($data['country'])) {
                    $country = $geoService->getCountryCode($data['lat'], $data['lon']);
                    if ($country) $data['country'] = $country;
                }

                if ($coordsChanged || empty($data['timezone'])) {
                    $timezone = $geoService->getTimezone($data['lat'], $data['lon']);
                    if ($timezone) $data['timezone'] = $timezone;
                }
            } catch (\Throwable $e) {
                \Log::warning("Branch auto-detect failed: " . $e->getMessage());
            }
        }

        // Filter $data to only include columns that actually exist on the branches table.
        try {
            $schemaCols = \Schema::getColumnListing('company_branches');
            $data = array_intersect_key($data, array_flip($schemaCols));
        } catch (\Throwable $e) {
            \Log::warning("Schema check failed, continuing with full payload: " . $e->getMessage());
        }

        if (!empty($data['user_id'])) {
            CompanyBranch::where("user_id", $data['user_id'])->update(["user_id" => 0]);
        }

        // if (isset($request->logo)) {
        //     $file = $request->file('logo');
        //     $ext = $file->getClientOriginalExtension();
        //     $fileName = time() . '.' . $ext;
        //     $request->file('logo')->move(public_path('/upload'), $fileName);
        //     $data['logo'] = $fileName;
        // }

        try {
            $record = $model->where("id", $id)->update($data);

            if ($record) {
                return $this->response('Branch successfully updated.', null, true);
            } else {
                return $this->response('Branch cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function updateGeoFencing(Request $request, $id)
    {
        try {
            $updateData = [
                "lat" => $request->lat,
                "lon" => $request->lon,
                "geofence_enabled" => $request->geofence_enabled,
                "geofence_radius_meter" => $request->geofence_radius_meter,
            ];

            // Auto-detect country/timezone — opt-in via GEOCODE_ON_UPDATE=true in .env.
            if (env('GEOCODE_ON_UPDATE', false) && !empty($request->lat) && !empty($request->lon)) {
                try {
                    $geoService = new ReverseGeocodeService();
                    $schema = \Schema::getColumnListing('company_branches');

                    if (in_array('country', $schema)) {
                        $country = $geoService->getCountryCode($request->lat, $request->lon);
                        if ($country) $updateData['country'] = $country;
                    }
                    if (in_array('timezone', $schema)) {
                        $timezone = $geoService->getTimezone($request->lat, $request->lon);
                        if ($timezone) $updateData['timezone'] = $timezone;
                    }
                } catch (\Throwable $e) {
                    \Log::warning("Geo auto-detect failed, continuing without: " . $e->getMessage());
                }
            }

            $record = CompanyBranch::where("id", $id)->update($updateData);

            if ($record) {
                return $this->response('Branch successfully updated.', null, true);
            } else {
                return $this->response('Branch cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function index(Request $request)
    {

        $search = strtolower($request->search);


        $model = CompanyBranch::query();

        $model->where('company_id', $request->company_id);

        $model->when($request->filled("branch_id"), function ($q) use ($request) {
            return $q->where("id", $request->branch_id);
        });

        $model->when($request->filled("branch_ids"), function ($q) use ($request) {
            return $q->whereIn("id", $request->branch_ids);
        });

        $model->when($request->filled("search"), function ($q) use ($search) {
            return $q->whereRaw('LOWER(branch_name) LIKE ?', ["%{$search}%"]);
        });

        $model->when($request->filled("filter_branch_id"), function ($q) use ($request) {
            return $q->where("id", $request->filter_branch_id);
        });

        // $model->when($request->filled("location_address"), function ($q) use ($request) {
        //     return $q->where("location_address", env('WILD_CARD') ?? 'ILIKE', $request->location_address);
        // });

        $model->when($request->filled("location_address"), function ($q) use ($request) {

            $q->where(function ($q) use ($request) {
                $q->where("location", env('WILD_CARD') ?? 'ILIKE', $request->location_address . '%');
                $q->orWhere("address", env('WILD_CARD') ?? 'ILIKE', $request->location_address . '%');
            });
        });
        $model->when($request->filled("manager_mobile"), function ($q) use ($request) {

            // $q->whereHas('user.employee', fn (Builder $query) => $query->where('first_name', env('WILD_CARD') ?? 'ILIKE',   $request->manager_mobile));
            // $q->orwhereHas('user.employee', fn (Builder $query) => $query->where('phone_number', env('WILD_CARD') ?? 'ILIKE',   $request->manager_mobile));
            $q->where(function ($q) use ($request) {
                $q->whereHas('user.employee', fn(Builder $query) => $query->where('first_name', env('WILD_CARD') ?? 'ILIKE',   $request->manager_mobile . '%'));
                $q->orwhereHas('user.employee', fn(Builder $query) => $query->where('phone_number', env('WILD_CARD') ?? 'ILIKE',   $request->manager_mobile . '%'));
            });
        });


        $model->with("user.employee")->withCount(["employees", "devices", "departments"]);

        return $model->orderBy("id", "desc")->paginate($request->per_page ?? 100);
    }

    public function destroy($id)
    {
        try {
            $record = CompanyBranch::find($id);

            if (!$record) {
                return response()->json(['message' => 'No such record found.'], 404);
            }

            DB::transaction(function () use ($record) {
                $user_id = $record->user_id;
                $record->delete();
                User::where('id', $user_id)->delete();
            });

            return response()->json(['message' => 'Branch successfully deleted.', 'status' => true], 200);
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
