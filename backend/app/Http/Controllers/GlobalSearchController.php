<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Timezone;
use App\Models\User;
use App\Models\Visitor;
use Carbon\Carbon;
use DateTime;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;


class GlobalSearchController extends Controller
{


    public function globalSearch(Request $request)
    {


        $data['employees'] = $this->globalSearchEmployees($request);
        $data['visitors'] = $this->globalSearchVisitors($request);

        return $data;
    }
    public function globalSearchEmployees(Request $request)
    {
        $model = Employee::query();
        $model->where("company_id", $request->input("company_id"));

        $model->with([
            "user" => function ($q) {
                return $q->with(["branchLogin", "role"]);
            },
        ])
            ->with([
                "reportTo",   "schedule_all", "branch", "department", "department.branch", "sub_department", "designation", "payroll", "timezone", "passport",
                "emirate", "qualification", "bank", "leave_group",  "Visa", "reporting_manager",
            ])
            ->with(["schedule" => function ($q) {
                $q->with("roster");
            }])
            ->where('company_id', $request->company_id);


        // ->when($request->filled('search_value'), function ($q) use ($request) {
        //     $q->Where('system_user_id', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
        //     $q->orWhere('employee_id', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
        //     $q->orWhere('first_name', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
        //     $q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
        //     $q->orWhere('full_name', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
        //     $q->orWhere('phone_number', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
        //     $q->orWhere('local_email', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");

        //     $q->orWhereHas('branch', fn (Builder $query) => $query->where('branch_name', env('WILD_CARD') ?? 'ILIKE', "$request->search_value%"));
        //     $q->orWhereHas('department', fn (Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->search_value%"));
        // });


        $model->when($request->filled('search_value'), function ($q) use ($request) {
            $q->where(function ($q) use ($request) {
                $q->Where('system_user_id', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
                $q->orWhere('employee_id', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
                $q->orWhere('first_name', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
                $q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
                $q->orWhere('full_name', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
                $q->orWhere('phone_number', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");
                $q->orWhere('local_email', env('WILD_CARD') ?? 'ILIKE', "%$request->search_value%");

                $q->orWhereHas('branch', fn (Builder $query) => $query->where('branch_name', env('WILD_CARD') ?? 'ILIKE', "$request->search_value%"));
                $q->orWhereHas('department', fn (Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->search_value%"));
            });
        });

        // ->when($request->filled('sortBy'), function ($q) use ($request) {
        //     $sortDesc = $request->input('sortDesc');
        //     if (strpos($request->sortBy, '.')) {
        //         if ($request->sortBy == 'department.name.id' || $request->sortBy == 'department_name_id') {
        //             $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
        //         } else
        //         if ($request->sortBy == 'user.email') {
        //             $q->orderBy(User::select("email")->whereColumn("users.id", "employees.user_id"), $sortDesc == 'true' ? 'desc' : 'asc');
        //         } else
        //         if ($request->sortBy == 'schedule.shift_name') {
        //             // $q->orderBy(Schedule::select("shift")->whereColumn("schedule_employees.employee_id", "employees.id"), $sortDesc == 'true' ? 'desc' : 'asc');

        //         } else
        //         if ($request->sortBy == 'timezone.name') {
        //             $q->orderBy(Timezone::select("timezone_name")->whereColumn("timezones.id", "employees.timezone_id"), $sortDesc == 'true' ? 'desc' : 'asc');
        //         }
        //     } else if ($request->sortBy == 'department_name_id') {
        //         $q->orderBy(Department::select("name")->whereColumn("departments.id", "employees.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
        //     } else {
        //         $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
        //         }
        //     }
        // });

        if (!$request->sortBy) {
            $model->orderBy('first_name', 'asc');
        }

        return  $model->paginate($request->input("per_page", 100));
    }

    public function globalSearchVisitors(Request $request)
    {
        $model = Visitor::query();

        $model->where("company_id", $request->input("company_id"));

        // $model->when($request->filled('status_id'), fn ($q) => $q->Where('status_id',   $request->input("status_id")));

        // // $model->when($request->filled('branch_id'), fn ($q) => $q->Where('branch_id',   $request->input("branch_id")));

        // // $model->when($request->filled("from_date"), fn ($q) => $q->whereDate("visit_from", '<=', $request->input("from_date")));

        // // $model->when($request->filled("to_date"), fn ($q) => $q->whereDate("visit_to", '>=', $request->input("to_date")));

        if ($this->verifyDateFormat($request->search_value, "Y-m-d")) {
            $startDate = Carbon::parse($request->search_value);
            $endDate = Carbon::parse($request->search_value);



            $model = $model->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('visit_from', [$startDate, $endDate])
                    ->orWhereBetween('visit_to', [$startDate, $endDate])
                    ->orWhere(function ($query) use ($startDate, $endDate) {
                        $query->whereDate('visit_from', '<=', $startDate)
                            ->whereDate('visit_to', '>=', $endDate);
                    });
            });
        }
        // // $model->when($request->filled('search_value'), fn ($q) => $q->Where('host_company_id',   $request->input("search_value")));

        // // $model->when($request->filled('search_value'), fn ($q) => $q->Where('purpose_id',   $request->input("search_value")));

        // // $model->when($request->filled('search_value'), fn ($q) => $q->Where('branch_id',   $request->input("search_value")));



        // $ilikeFields = ['id', 'company_name', 'system_user_id', 'manager_name', 'phone', 'email', 'zone_id', 'phone_number', 'time_in'];


        // foreach ($ilikeFields as $field) {
        //     $model->when($request->filled($field), function ($q) use ($field, $request) {
        //         $q->when($request->filled('search_value'), fn ($q) => $q->where($field, env('WILD_CARD') ?? 'ILIKE', $request->input($field) . '%'));
        //     });
        // }

        $first_name = $request->search_value;

        $model->when($request->filled('search_value'), function ($q) use ($first_name) {
            $q->where(function ($q) use ($first_name) {
                $q->Where('first_name', env('WILD_CARD') ?? 'ILIKE', "$first_name%");
                $q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "$first_name%");
            });
        });

        $model->when($request->filled('search_value'), function ($q) use ($request) {
            $q->where(function ($q) use ($request) {
                $q->Where('phone_number', env('WILD_CARD') ?? 'ILIKE', "$request->search_value%");
                $q->orWhere('email', env('WILD_CARD') ?? 'ILIKE', "$request->search_value%");
                $q->orWhere('first_name', env('WILD_CARD') ?? 'ILIKE', "$request->search_value%");
                $q->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', "$request->search_value%");
            });
        });

        $model->with(["host" => fn ($q) => $q->withOut(["user", "employee"])]);

        // $model->orderBy("id", "DESC");

        // $model->when($request->filled('sortBy'), function ($q) use ($request) {
        //     if (!strpos($request->sortBy, '.')) {
        //         $q->orderBy($request->sortBy . "", $request->input('sortDesc') == 'true' ? 'desc' : 'asc');
        //     }
        // });



        $model->with(["branch", "zone", "zone.devices",  "host", "timezone:id,timezone_id,timezone_name", "purpose:id,name"]);

        return $model->paginate($request->input("per_page", 100));
    }

    function verifyDateFormat($date, $format = 'Y-m-d')
    {
        $d = DateTime::createFromFormat($format, $date);
        return $d && $d->format($format) === $date;
    }
}
