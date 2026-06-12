<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssignedDepartmentEmployee\StoreRequest;
use App\Http\Requests\AssignedDepartmentEmployee\UpdateRequest;
use App\Models\AssignDepartment;
use App\Models\AssignedDepartmentEmployee;
use App\Models\AssignEmployee;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssignedDepartmentEmployeeController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $model = AssignedDepartmentEmployee::query();
        $model->with(["employees", "departments"]);
        $model->where("company_id", $request->company_id);
        return $model->paginate($request->per_page ?? 100);
    }

    public function assigned_employee_list(Request $request)
    {
        $model = AssignedDepartmentEmployee::query();
        $model->with(["employees"]);
        $model->where("company_id", $request->company_id);
        $data = $model->get();

        return $data->pluck('employees')->flatten()->map(fn ($e) => $e->only(['id', 'first_name', "user_id"]));
    }
    public function employee_managers_list_all(Request $request)
    {

        $model = Employee::query();
        $model->with([
            "user" => function ($q) {
                return $q->with("role");
            },
        ]);
        $model->when($request->filled("branch_id"), function ($q) use ($request) {
            return $q->where("branch_id", $request->branch_id);
        });
        $model->whereHas("user.role", function ($q) {
            return $q->where('name', env('WILD_CARD') ?? 'ILIKE', "manager");
        });

        // $model->whereHas("user.role", function ($q) {
        //     return $q->where('id', ">", 0);
        // });

        $model->where("company_id", $request->company_id);


        return $model->select(['id', 'first_name', "last_name", "user_id"])->get();
    }
    public function show($id)
    {
        return (new AssignedDepartmentEmployee)->assginedDepartment($id)->get();
    }

    public function assigned_department_employee_list(Request $request)
    {
        return (new AssignedDepartmentEmployee)->filters($request)->withOut("department_employee")
            ->paginate($request->per_page ?? 100);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreRequest $request)
    {
        DB::beginTransaction();

        try {
            $record = AssignedDepartmentEmployee::create([
                'title' => $request->title,
                'company_id' => $request->company_id,
            ]);

            if ($record) {
                AssignDepartment::insert($this->departmentData($request->departments, $record->id));
                AssignEmployee::insert($this->employeeData($request->employees, $record->id));
                DB::commit();
                return $this->response('Department mapping Successfully created.', $record, true);
            } else {
                return $this->response('Department mapping cannot be created.', null, false);
            }
        } catch (\Throwable $th) {
            DB::rollback();
            throw $th;
        }
    }

    public function departmentData($departments, $id): array
    {
        $data = [];

        foreach ($departments as $department_id) {
            $data[] = [
                "model" => 'AssignedDepartmentEmployee',
                "department_id" =>  $department_id,
                "assigned_department_employee_id" => $id,
            ];
        }

        return $data;
    }

    public function employeeData($employees, $id): array
    {
        $data = [];

        foreach ($employees as $employee_id) {
            $data[] = [
                "model" => 'AssignedDepartmentEmployee',
                "employee_id" => $employee_id,
                "assigned_department_employee_id" => $id,
            ];
        }

        return $data;
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\AssignedDepartmentEmployee  $assignedDepartmentEmployee
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateRequest $request, AssignedDepartmentEmployee $assignedDepartmentEmployee)
    {
        try {
            $payload = $request->except('departments', 'employees');
            if ($assignedDepartmentEmployee->update($payload)) {
                AssignDepartment::where("assigned_department_employee_id", $assignedDepartmentEmployee->id)->delete();
                AssignEmployee::where("assigned_department_employee_id", $assignedDepartmentEmployee->id)->delete();
                AssignDepartment::insert($this->departmentData($request->departments, $assignedDepartmentEmployee->id));
                AssignEmployee::insert($this->employeeData($request->employees, $assignedDepartmentEmployee->id));
                return $this->response('Department mapping successfully updated.', $assignedDepartmentEmployee, true);
            } else {
                return $this->response('Department mapping cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\AssignedDepartmentEmployee  $assignedDepartmentEmployee
     * @return \Illuminate\Http\Response
     */
    public function destroy(AssignedDepartmentEmployee $assignedDepartmentEmployee)
    {
        AssignDepartment::where("assigned_department_employee_id", $assignedDepartmentEmployee->id)->delete();
        AssignEmployee::where("assigned_department_employee_id", $assignedDepartmentEmployee->id)->delete();

        $record = $assignedDepartmentEmployee->delete();
        if ($record) {
            return $this->response('Department mapping successfully deleted.', $record, true);
        } else {
            return $this->response('Department mapping cannot delete.', null, false);
        }
    }
}
