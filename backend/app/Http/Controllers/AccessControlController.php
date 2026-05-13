<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AttendanceLog;
use App\Models\Company;
use App\Models\Device;
use App\Models\Employee;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;

class AccessControlController extends Controller
{
    public function index(AttendanceLog $model, Request $request)
    {
        $model = AttendanceLog::query();

        $model->where("company_id", $request->company_id);

        $model->where('LogTime', '>=', $request->filled("from_date") && $request->from_date !== 'null' ? $request->from_date . " 00:00:00" : date("Y-m-d 00:00:00"));

        $model->where('LogTime', '<=', $request->filled("to_date") && $request->to_date !== 'null' ? $request->to_date . " 23:59:59"  : date("Y-m-d 23:59:59"));

        $model->whereHas('device', fn($q) => $q->whereIn('device_type', ["all", "Access Control"]));

        $model->whereHas('employee', fn($q) => $q->where("company_id", $request->company_id));

        $model->when(request()->filled("report_type"), function ($query) use ($request) {
            if ($request->report_type == "Allowed") {
                return $query->where('status', $request->report_type);
            } else if ($request->report_type == "Access Denied") {
                return $query->where('status', $request->report_type);
            }
        });

        // $model->when(request()->filled("user_type"), function ($query) use ($request) {
        //     if ($request->user_type == "Employee") {
        //         return $query->where('status', $request->user_type);
        //     } else if ($request->user_type == "Visitor") {
        //         return $query->where('status', $request->user_type);
        //     }
        // });

        $model->when(request()->filled("UserID"), function ($query) use ($request) {
            return $query->where('UserID', $request->UserID);
        });

        $model->when(request()->filled("DeviceID"), function ($query) use ($request) {
            return $query->where('DeviceID', $request->DeviceID);
        });

        $model->with("device");

        $model->with('employee', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
            // Include schedule (needed for shift_type_id in the Access Control
            // log report) but skip the heavier unrelated relations.
            $q->withOut(["sub_department", "designation", "user"]);
            $q->with('schedule', function ($s) {
                $s->select('id', 'employee_id', 'shift_type_id');
            });

            $q->select(
                "id",
                "first_name",
                "last_name",
                "phone_number",
                "profile_picture",
                "employee_id",
                "branch_id",
                "system_user_id",
                "display_name",
                "timezone_id",
                "department_id",
            );
        })
            // ->distinct("LogTime", "UserID", "company_id")
            ->when($request->filled('department_ids'), function ($q) use ($request) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('department_id', $request->department_ids));
            })

            ->with('device', function ($q) use ($request) {
                $q->where('company_id', $request->company_id);
            })


            ->when($request->filled('department'), function ($q) use ($request) {

                $q->whereHas('employee', fn(Builder $query) => $query->where('department_id', $request->department));
            })

            ->when($request->filled('device'), function ($q) use ($request) {
                $q->where('DeviceID', $request->device);
            })
            ->when($request->filled('system_user_id'), function ($q) use ($request) {
                $q->where('UserID', $request->system_user_id);
            })
            ->when($request->filled('mode'), function ($q) use ($request) {
                $q->whereHas('device', fn(Builder $query) => $query->where('mode', $request->mode));
            })
            ->when($request->filled('function'), function ($q) use ($request) {
                $q->whereHas('device', fn(Builder $query) => $query->where('function', $request->function));
            })
            ->when($request->filled('devicelocation'), function ($q) use ($request) {
                if ($request->devicelocation != 'All Locations') {

                    $q->whereHas('device', fn(Builder $query) => $query->where('location', env('WILD_CARD') ?? 'ILIKE', "$request->devicelocation%"));
                }
            })
            ->when($request->filled('employee_first_name'), function ($q) use ($request) {
                $key = strtolower($request->employee_first_name);
                $q->whereHas('employee', fn(Builder $query) => $query->where('first_name', env('WILD_CARD') ?? 'ILIKE', "$key%"));
            })
            ->when($request->filled('branch_id'), function ($q) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('branch_id', request("branch_id")));
            })

            ->when(
                $request->filled('sortBy'),
                function ($q) use ($request) {
                    $sortDesc = $request->input('sortDesc');
                    if (strpos($request->sortBy, '.')) {
                        if ($request->sortBy == 'employee.first_name') {
                            $q->orderBy(Employee::select("first_name")->where("company_id", $request->company_id)->whereColumn("employees.system_user_id", "attendance_logs.UserID"), $sortDesc == 'true' ? 'desc' : 'asc');
                        } else if ($request->sortBy == 'device.name') {
                            $q->orderBy(Device::select("name")->where("company_id", $request->company_id)->whereColumn("devices.device_id", "attendance_logs.DeviceID"), $sortDesc == 'true' ? 'desc' : 'asc');
                        } else if ($request->sortBy == 'device.location') {
                            $q->orderBy(Device::select("location")->where("company_id", $request->company_id)->whereColumn("devices.device_id", "attendance_logs.DeviceID"), $sortDesc == 'true' ? 'desc' : 'asc');
                        }
                    } else {
                        $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                        }
                    }
                }
            );
        if (!$request->sortBy) {
            $model->orderBy('LogTime', 'DESC');
        }


        return $model->paginate($request->per_page);
    }

    public function access_control_report_print_pdf(AttendanceLog $model, Request $request)
    {
        $model = AttendanceLog::query();

        $model->where("company_id", $request->company_id);

        $model->whereDate('LogTime', '>=', $request->filled("from_date") && $request->from_date !== 'null' ? $request->from_date . " 00:00:00" : date("Y-m-d 00:00:00"));

        $model->whereDate('LogTime', '<=', $request->filled("to_date") && $request->to_date !== 'null' ? $request->to_date . " 23:59:59" : date("Y-m-d 23:59:59"));

        $model->whereHas('device', fn($q) => $q->whereIn('device_type', ["all", "Access Control"]));

        $model->whereHas('employee', fn($q) => $q->where("company_id", $request->company_id));

        $model->when(request()->filled("report_type"), function ($query) use ($request) {
            if ($request->report_type == "Allowed") {
                return $query->where('status', $request->report_type);
            } else if ($request->report_type == "Access Denied") {
                return $query->where('status', $request->report_type);
            }
        });

        $model->when(request()->filled("UserID"), function ($query) use ($request) {
            return $query->where('UserID', $request->UserID);
        });

        $model->when(request()->filled("DeviceID"), function ($query) use ($request) {
            return $query->where('DeviceID', $request->DeviceID);
        });


        $model->with("device");

        $model->with('employee', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
            $q->withOut(["schedule", "department", "sub_department", "designation", "user"]);

            $q->select(
                "first_name",
                "last_name",
                "profile_picture",
                "employee_id",
                "branch_id",
                "system_user_id",
                "display_name",
                "timezone_id",
            );
        })
            // ->distinct("LogTime", "UserID", "company_id")
            ->when($request->filled('department_ids'), function ($q) use ($request) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('department_id', $request->department_ids));
            })

            ->with('device', function ($q) use ($request) {
                $q->where('company_id', $request->company_id);
            })


            ->when($request->filled('department'), function ($q) use ($request) {

                $q->whereHas('employee', fn(Builder $query) => $query->where('department_id', $request->department));
            })
            ->when($request->filled('LogTime'), function ($q) use ($request) {

                $q->where('LogTime', 'LIKE', "$request->LogTime%");
            })
            ->when($request->filled('device'), function ($q) use ($request) {
                $q->where('DeviceID', $request->device);
            })
            ->when($request->filled('system_user_id'), function ($q) use ($request) {
                $q->where('UserID', $request->system_user_id);
            })
            ->when($request->filled('mode'), function ($q) use ($request) {
                $q->whereHas('device', fn(Builder $query) => $query->where('mode', $request->mode));
            })
            ->when($request->filled('function'), function ($q) use ($request) {
                $q->whereHas('device', fn(Builder $query) => $query->where('function', $request->function));
            })
            ->when($request->filled('devicelocation'), function ($q) use ($request) {
                if ($request->devicelocation != 'All Locations') {

                    $q->whereHas('device', fn(Builder $query) => $query->where('location', env('WILD_CARD') ?? 'ILIKE', "$request->devicelocation%"));
                }
            })
            ->when($request->filled('employee_first_name'), function ($q) use ($request) {
                $key = strtolower($request->employee_first_name);
                $q->whereHas('employee', fn(Builder $query) => $query->where('first_name', env('WILD_CARD') ?? 'ILIKE', "$key%"));
            })
            ->when($request->filled('branch_id'), function ($q) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('branch_id', request("branch_id")));
            })

            ->when(
                $request->filled('sortBy'),
                function ($q) use ($request) {
                    $sortDesc = $request->input('sortDesc');
                    if (strpos($request->sortBy, '.')) {
                        if ($request->sortBy == 'employee.first_name') {
                            $q->orderBy(Employee::select("first_name")->where("company_id", $request->company_id)->whereColumn("employees.system_user_id", "attendance_logs.UserID"), $sortDesc == 'true' ? 'desc' : 'asc');
                        } else if ($request->sortBy == 'device.name') {
                            $q->orderBy(Device::select("name")->where("company_id", $request->company_id)->whereColumn("devices.device_id", "attendance_logs.DeviceID"), $sortDesc == 'true' ? 'desc' : 'asc');
                        } else if ($request->sortBy == 'device.location') {
                            $q->orderBy(Device::select("location")->where("company_id", $request->company_id)->whereColumn("devices.device_id", "attendance_logs.DeviceID"), $sortDesc == 'true' ? 'desc' : 'asc');
                        }
                    } else {
                        $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                        }
                    }
                }
            );
        if (!$request->sortBy) {
            $model->orderBy('LogTime', 'DESC');
        }


        $data = $model->get()->toArray();

        if ($request->debug) return $data;

        return Pdf::loadView("pdf.access_control_reports.custom", [
            "data" => $data,
            "company" => Company::whereId(request("company_id") ?? 0)->first(),
            "params" => $request->all()
        ])->stream();
    }

    public function access_control_report_download_pdf(AttendanceLog $model, Request $request)
    {
        $model = AttendanceLog::query();

        $model->where("company_id", $request->company_id);

        $model->whereDate('LogTime', '>=', $request->filled("from_date") && $request->from_date !== 'null' ? $request->from_date . " 00:00:00" : date("Y-m-d  00:00:00"));

        $model->whereDate('LogTime', '<=', $request->filled("to_date") && $request->to_date !== 'null' ? $request->to_date . " 23:59:59"  : date("Y-m-d  23:59:59"));

        $model->whereHas('device', fn($q) => $q->whereIn('device_type', ["all", "Access Control"]));

        $model->whereHas('employee', fn($q) => $q->where("company_id", $request->company_id));

        $model->when(request()->filled("report_type"), function ($query) use ($request) {
            if ($request->report_type == "Allowed") {
                return $query->where('status', $request->report_type);
            } else if ($request->report_type == "Access Denied") {
                return $query->where('status', $request->report_type);
            }
        });

        $model->when(request()->filled("UserID"), function ($query) use ($request) {
            return $query->where('UserID', $request->UserID);
        });

        $model->when(request()->filled("DeviceID"), function ($query) use ($request) {
            return $query->where('DeviceID', $request->DeviceID);
        });


        $model->with("device");



        $model->with('employee', function ($q) use ($request) {
            $q->where('company_id', $request->company_id);
            $q->withOut(["schedule", "department", "sub_department", "designation", "user"]);

            $q->select(
                "first_name",
                "last_name",
                "profile_picture",
                "employee_id",
                "branch_id",
                "system_user_id",
                "display_name",
                "timezone_id",
            );
        })
            // ->distinct("LogTime", "UserID", "company_id")
            ->when($request->filled('department_ids'), function ($q) use ($request) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('department_id', $request->department_ids));
            })

            ->with('device', function ($q) use ($request) {
                $q->where('company_id', $request->company_id);
            })


            ->when($request->filled('department'), function ($q) use ($request) {

                $q->whereHas('employee', fn(Builder $query) => $query->where('department_id', $request->department));
            })
            ->when($request->filled('LogTime'), function ($q) use ($request) {

                $q->where('LogTime', 'LIKE', "$request->LogTime%");
            })
            ->when($request->filled('device'), function ($q) use ($request) {
                $q->where('DeviceID', $request->device);
            })
            ->when($request->filled('system_user_id'), function ($q) use ($request) {
                $q->where('UserID', $request->system_user_id);
            })
            ->when($request->filled('mode'), function ($q) use ($request) {
                $q->whereHas('device', fn(Builder $query) => $query->where('mode', $request->mode));
            })
            ->when($request->filled('function'), function ($q) use ($request) {
                $q->whereHas('device', fn(Builder $query) => $query->where('function', $request->function));
            })
            ->when($request->filled('devicelocation'), function ($q) use ($request) {
                if ($request->devicelocation != 'All Locations') {

                    $q->whereHas('device', fn(Builder $query) => $query->where('location', env('WILD_CARD') ?? 'ILIKE', "$request->devicelocation%"));
                }
            })
            ->when($request->filled('employee_first_name'), function ($q) use ($request) {
                $key = strtolower($request->employee_first_name);
                $q->whereHas('employee', fn(Builder $query) => $query->where('first_name', env('WILD_CARD') ?? 'ILIKE', "$key%"));
            })
            ->when($request->filled('branch_id'), function ($q) {
                $q->whereHas('employee', fn(Builder $query) => $query->where('branch_id', request("branch_id")));
            })

            ->when(
                $request->filled('sortBy'),
                function ($q) use ($request) {
                    $sortDesc = $request->input('sortDesc');
                    if (strpos($request->sortBy, '.')) {
                        if ($request->sortBy == 'employee.first_name') {
                            $q->orderBy(Employee::select("first_name")->where("company_id", $request->company_id)->whereColumn("employees.system_user_id", "attendance_logs.UserID"), $sortDesc == 'true' ? 'desc' : 'asc');
                        } else if ($request->sortBy == 'device.name') {
                            $q->orderBy(Device::select("name")->where("company_id", $request->company_id)->whereColumn("devices.device_id", "attendance_logs.DeviceID"), $sortDesc == 'true' ? 'desc' : 'asc');
                        } else if ($request->sortBy == 'device.location') {
                            $q->orderBy(Device::select("location")->where("company_id", $request->company_id)->whereColumn("devices.device_id", "attendance_logs.DeviceID"), $sortDesc == 'true' ? 'desc' : 'asc');
                        }
                    } else {
                        $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                        }
                    }
                }
            );
        if (!$request->sortBy) {
            $model->orderBy('LogTime', 'DESC');
        }

        $data = $model->get()->toArray();

        if ($request->debug) return $data;

        return Pdf::loadView("pdf.access_control_reports.custom", [
            "data" => $data,
            "company" => Company::whereId(request("company_id") ?? 0)->first(),
            "params" => $request->all()
        ])->download();
    }
}
