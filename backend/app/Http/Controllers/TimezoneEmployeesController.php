<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Timezone;
use App\Models\TimezoneEmployees;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class TimezoneEmployeesController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        //
    }

    public function getTimezoneEmployeeId(Request $request, $id)
    {
        return TimezoneEmployees::where("employee_table_id", $id)->get();
    }

    public function employeesWithTimezoneCount(Request $request)
    {
        $model = Employee::with(["branch", "sub_department",  "department.branch", "sub_department"])
            ->where('company_id', $request->company_id)
            ->when($request->filled('department_id'), fn($q) => $q->where('department_id', $request->department_id))
            ->when($request->filled('branch_id'), fn($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->filled('branch_ids'), fn($q) => $q->whereIn('branch_id', $request->branch_ids))
            ->when($request->filled('department_ids'), fn($q) => $q->whereIn('department_id', $request->department_ids))
            ->with(["timezones_mapped.device", "timezones_mapped.timezone"]);


        $model->when($request->filled('common_search'), function ($q) use ($request) {
            $q->where(function ($q) use ($request) {
                $q->Where('system_user_id', env('WILD_CARD') ?? 'ILIKE', "%$request->common_search%");
                $q->orWhere('employee_id', env('WILD_CARD') ?? 'ILIKE', "%$request->common_search%");
                $q->orWhere('first_name', env('WILD_CARD') ?? 'ILIKE', "%$request->common_search%");
                $q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "%$request->common_search%");
                $q->orWhere('full_name', env('WILD_CARD') ?? 'ILIKE', "%$request->common_search%");
                $q->orWhere('phone_number', env('WILD_CARD') ?? 'ILIKE', "%$request->common_search%");
                $q->orWhere('local_email', env('WILD_CARD') ?? 'ILIKE', "%$request->common_search%");

                $q->orWhereHas('branch', fn(Builder $query) => $query->where('branch_name', env('WILD_CARD') ?? 'ILIKE', "$request->common_search%")->where('company_id', $request->company_id));
                $q->orWhereHas('department', fn(Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->common_search%")->where('company_id', $request->company_id));
                // $q->orWhereHas('schedule.shift', fn (Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->common_search%")->where('company_id', $request->company_id)->where('company_id', $request->company_id));

                // $q->orWhereHas('schedule_active.shift', fn(Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE',  "$request->common_search%")

                //     ->where('company_id', $request->company_id));
            });
        });

        $model->when($request->filled('filter_device_id'), function ($q) use ($request) {
            $q->whereHas('timezones_mapped', function ($qQ) use ($request) {
                $qQ->where('device_table_id', $request->filter_device_id);
            });
        });
        $model->when($request->filled('filter_timezone_id'), function ($q) use ($request) {
            // $q->with(["timezones_mapped" => function ($qq) use ($request) {
            //     $qq->where("timezone_table_id", $request->filter_timezone_id);
            // }]);

            $q->whereHas('timezones_mapped', function ($qQ) use ($request) {
                $qQ->where('timezone_table_id', $request->filter_timezone_id);
            });
        });

        // if ($request->department_ids) {
        //     if (!in_array("---", $request->department_ids)) {
        //         $model->whereIn("department_id", $request->department_ids);
        //     }


        //     $model->with("department", function ($q) use ($request) {
        //         $q->whereCompanyId($request->company_id);
        //     });
        //     $model->with("sub_department", function ($q) use ($request) {
        //         $q->whereCompanyId($request->company_id);
        //     });

        //     $model->with("schedule", function ($q) use ($request) {
        //         $q->whereCompanyId($request->company_id);
        //     });
        // }



        //$model->has('schedule_active.shift_type_id', '>', 2);

        // $model->with(["schedule_all" => function ($q) use ($request) {
        //     $q->where("company_id", $request->company_id);
        // }]);

        // if ($request->filled('schedules_count')) {
        //     if ($request->schedules_count == 0) {
        //         $model->whereDoesntHave('schedule_active', function ($q) use ($request) {
        //             $q->where('company_id', $request->company_id);
        //         });
        //     } elseif ($request->schedules_count == 1) {
        //         $model->whereHas('schedule_active', function ($q) use ($request) {
        //             $q->where('company_id', $request->company_id);
        //         });
        //     }
        // }



        // // $model->with(["schedule" => function ($q) use ($request) {
        //     $q->where("company_id", $request->company_id);
        //     $q->where("to_date", ">=", date('Y-m-d'));


        //     // $q->select("shift_id", "isOverTime", "employee_id", "shift_type_id", "shift_id", "shift_id");
        //     $q->orderBy("to_date", "asc");
        // }]);


        $model->when($request->filled('first_name'), function ($q) use ($request) {


            $q->Where(function ($q) use ($request) {
                $q->where('first_name', env('WILD_CARD') ?? 'ILIKE', "$request->first_name%");
                $q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "$request->first_name%");
            });
        });

        $model->when($request->filled('employee_id'), function ($q) use ($request) {


            $q->Where(function ($q) use ($request) {
                $q->where('employee_id', env('WILD_CARD') ?? 'ILIKE', "$request->employee_id%");
                $q->orWhere('system_user_id', env('WILD_CARD') ?? 'ILIKE', "$request->employee_id%");
            });
        });


        $model->without(["user"]);




        return   $model->paginate($request->per_page);
    }



    public function timezonesDeviceEmployeesUpdate(Request $request)
    {
        $data = $request->all();
        $sdk = new SDKController();
        $results = [];

        foreach ($data["employee_ids"] as $item) {

            $employee = Employee::where("company_id", $request->company_id)
                ->where("id", $item)->first();
            if (!$employee) {
                continue;
            }

            // (a) Reset this employee's existing device groups back to Full Access on-device,
            //     so a device they're being removed from stops enforcing the old window.
            $previous = TimezoneEmployees::with(["device"])
                ->where("company_id", $request->company_id)
                ->where("employee_table_id", $item)
                ->get();

            foreach ($previous as $old) {
                if (!$old->device) {
                    continue;
                }
                $sdk->processSDKTimeZoneONEJSONData(null, [
                    'personList' => [[
                        'name' => $employee["display_name"],
                        'userCode' => $employee["system_user_id"],
                        'timeGroup' => 1, // Full Access
                    ]],
                    'snList' => [$old->device["device_id"]],
                ]);
            }

            // (b) Clear DB rows, then (c) write new rows and (d) push the new groups to devices.
            TimezoneEmployees::where("company_id", $request->company_id)
                ->where("employee_table_id", $item)
                ->delete();

            foreach ($data["mappings"] as $timezone) {
                $deviceTableId = $timezone["id"] ?? '';
                $timezoneTableId = $timezone["timezone_table_id"] ?? '';
                if ($deviceTableId === '' || $timezoneTableId === '') {
                    continue;
                }
                $deviceTimezoneId = $timezone["device_timezone_id"] ?? 1;

                $results[] = TimezoneEmployees::create([
                    "device_table_id" => $deviceTableId,
                    "company_id" => $request->company_id,
                    "timezone_table_id" => $timezoneTableId,
                    "employee_table_id" => $item,
                    "device_timezone_id" => $deviceTimezoneId,
                ]);

                if (!empty($timezone["serial_number"])) {
                    $sdk->processSDKTimeZoneONEJSONData(null, [
                        'personList' => [[
                            'name' => $employee["display_name"],
                            'userCode' => $employee["system_user_id"],
                            'timeGroup' => $deviceTimezoneId,
                        ]],
                        'snList' => [$timezone["serial_number"]],
                    ]);
                }
            }

            // Keep the convenience column on the employee in sync (first mapping's group).
            $firstGroup = $data["mappings"][0]["device_timezone_id"] ?? 1;
            $employee->update(['timezone_id' => $firstGroup]);
        }

        return $this->response("Successfully Updated", $results, true); // outside the loop
    }

    public function timezoneEmployeesUpdate(Request $request)
    {
        $data = $request->all();

        $arr = [];

        foreach ($data["employee_ids"] as $item) {




            //reset timezone  on Device with 1 full access  
            $previousTimezones =   TimezoneEmployees::with(["device", "employee"])
                ->where("company_id", $request->company_id)
                ->where("employee_table_id", $item)
                ->get();


            foreach ($previousTimezones as $key => $empTimezone) {

                $jsonData = [
                    'personList' => [
                        [
                            'name' => $empTimezone->employee["display_name"],

                            'userCode' => $empTimezone->employee["system_user_id"],
                            'timeGroup' => 1, //reset to 1//full access
                        ]
                    ],
                    'snList' =>  [$empTimezone->device["device_id"],]
                ];

                (new SDKController())->processSDKTimeZoneONEJSONData(null, $jsonData);
            }

            //delete Employee data  from table 
            TimezoneEmployees::where("company_id", $request->company_id)
                ->where("employee_table_id", $item)
                ->delete();

            $record = [];
            foreach ($data["mappings"] as $timezone) {

                if ($timezone["device_table_id"] != '' && $timezone["timezone_table_id"] != '' && $timezone["device_timezone_id"] != '') {
                    $value = [
                        "device_table_id" => $timezone["device_table_id"],
                        "company_id" => $request->company_id,
                        "timezone_table_id" => $timezone["timezone_table_id"],
                        "employee_table_id" => $item,
                        "device_timezone_id" => $timezone["device_timezone_id"],

                    ];

                    // TimezoneEmployees::where("company_id", $request->company_id)
                    //     ->where("employee_table_id", $item)
                    //     ->where("device_table_id", $timezone["device_table_id"])
                    //     ->where("timezone_table_id", $timezone["timezone_table_id"])->count();

                    $record[] = TimezoneEmployees::create($value);
                }
            }


            return $this->response("Successfully Updated", $record, true);


            // if (!$found) {
            //     $arr[] = $value;
            // }
        }
    }
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\TimezoneEmployees  $timezoneEmployees
     * @return \Illuminate\Http\Response
     */
    public function show(TimezoneEmployees $timezoneEmployees)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Models\TimezoneEmployees  $timezoneEmployees
     * @return \Illuminate\Http\Response
     */
    public function edit(TimezoneEmployees $timezoneEmployees)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\TimezoneEmployees  $timezoneEmployees
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, TimezoneEmployees $timezoneEmployees)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\TimezoneEmployees  $timezoneEmployees
     * @return \Illuminate\Http\Response
     */
    public function destroy(TimezoneEmployees $timezoneEmployees)
    {
        //
    }
}
