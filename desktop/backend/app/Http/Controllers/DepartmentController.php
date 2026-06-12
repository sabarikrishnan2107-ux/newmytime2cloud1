<?php

namespace App\Http\Controllers;

use App\Http\Requests\Department\DepartmentRequest;
use App\Http\Requests\Department\DepartmentUpdateRequest;
use App\Models\CompanyBranch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DepartmentController extends Controller
{
    public function dropdownList(Request $request)
    {
        $model = Department::query();
        $model->where('company_id', $request->company_id);
        $model->when($request->user_type == "department", fn($q) => $q->where("id", $request->department_id));
        $model->when(request()->filled('branch_id'), fn($q) => $q->where('branch_id', request('branch_id')));
        $model->when(request()->filled('department_ids'), fn($q) => $q->whereIn('id', request('department_ids')));
        $model->when(request()->filled('branch_ids'), fn($q) => $q->whereIn('branch_id', request('branch_ids')));
        $model->orderBy(request('order_by') ? "id" : 'name', request('sort_by_desc') ? "desc" : "asc");
        return $model->get(["id", "name"]);
    }

    public function index(Department $department, Request $request)
    {
        return $department->filter($request)->orderBy("id", "desc")->paginate(500);
    }

    public function departmentEmployee(Request $request)
    {
        $model = Department::query();
        $model->where('company_id', $request->company_id);
        $model->with(['branch', 'employees:id,employee_id,system_user_id,first_name,last_name,display_name,department_id']);

        $model->select("id", "name");
        return $model->paginate($request->per_page);
    }

    public function search(Request $request, $key)
    {
        $model = Department::query();
        $model->where('id', 'LIKE', "%$key%");
        $model->where('company_id', $request->company_id);
        $model->orWhere('name', 'LIKE', "%$key%");
        return $model->with('children')->paginate($request->per_page);
    }

    public function store(Department $model, DepartmentRequest $request)
    {
        try {
            $record = $model->create($request->validated());

            if ($record) {
                return $this->response('Department successfully added.', $record->with('children'), true);
            } else {
                return $this->response('Department cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show(Department $Department)
    {
        return $Department->with('children');
    }

    public function update(DepartmentUpdateRequest $request, Department $Department)
    {
        try {

            $record = $Department->update($request->validated());

            if ($record) {
                return $this->response('Department successfully updated.', $Department->with('children'), true);
            } else {
                return $this->response('Department cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function destroy(Department $department)
    {
        // Start a transaction to ensure data integrity
        return DB::transaction(function () use ($department) {
            try {
                // 1. Delete associated Users
                \App\Models\User::where("department_id", $department->id)->delete();

                // 2. Delete associated SubDepartments
                // This assumes your relationship is named 'sub_departments'
                $department->sub_departments()->delete();

                // 3. Finally, delete the Department
                if ($department->delete()) {
                    return $this->response('Department and all related data successfully deleted.', null, true);
                }

                return $this->response('Department could not be deleted.', null, false);
            } catch (\Throwable $th) {
                // If anything fails, the transaction rolls back automatically
                return $this->response('Error: ' . $th->getMessage(), null, false);
            }
        });
    }

    public function deleteSelected(Department $model, Request $request)
    {
        try {
            $record = $model->whereIn('id', $request->ids)->delete();

            if ($record) {
                return $this->response('Department successfully deleted.', null, true);
            } else {
                return $this->response('Department cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
