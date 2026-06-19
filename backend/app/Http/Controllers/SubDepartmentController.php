<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubDepartment\SubDepartmentRequest;
use App\Http\Requests\SubDepartment\SubDepartmentUpdateRequest;
use App\Models\Department;
use App\Models\SubDepartment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubDepartmentController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->company_id;

        // 1. Departments Query
        $departments = DB::table('departments')
            ->leftJoin('company_branches', 'departments.branch_id', '=', 'company_branches.id')
            ->select(
                'departments.id',
                'departments.name',
                'departments.description',
                DB::raw("'Department' as type"),
                'departments.id as group_id',
                DB::raw("1 as sort_weight"),
                'departments.company_id',
                'departments.created_at',
                'company_branches.branch_name', // Column 8
                'company_branches.id as branch_id',
                DB::raw("NULL as parent_name"), // Column 9
                'departments.id as department_id', // Column 9
                DB::raw("(SELECT COUNT(*) FROM employees WHERE employees.department_id = departments.id) as employees_count") // Column 10
            )
            ->where('departments.company_id', $companyId);

        // 2. Sub-Departments Query
        $subDepartments = DB::table('sub_departments')
            ->leftJoin('departments', 'sub_departments.department_id', '=', 'departments.id')
            ->leftJoin('company_branches', 'departments.branch_id', '=', 'company_branches.id')
            ->select(
                'sub_departments.id',
                'sub_departments.name',
                'sub_departments.description',
                DB::raw("'Sub-Department' as type"),
                'sub_departments.department_id as group_id',
                DB::raw("2 as sort_weight"),
                'sub_departments.company_id',
                'sub_departments.created_at',
                'company_branches.branch_name', // Column 8
                'company_branches.id as branch_id', // Column 8
                'departments.name as parent_name', // Column 9
                'departments.id as department_id', // Column 9
                DB::raw("(SELECT COUNT(*) FROM employees WHERE employees.sub_department_id = sub_departments.id) as employees_count") // Column 10
            )
            ->where('sub_departments.company_id', $companyId);

        // 3. Union and Sort
        return $departments
            ->union($subDepartments)
            ->orderBy('group_id', 'desc')
            ->orderBy('sort_weight', 'asc')
            ->paginate($request->per_page);
    }

    public function search(SubDepartment $model, Request $request, $key)
    {
        $model->where('id', 'LIKE', "%$key%");

        $model->orWhere('name', 'LIKE', "%$key%");

        return $model->with('department')->paginate($request->per_page);
    }

    public function store(SubDepartment $model, SubDepartmentRequest $request)
    {
        try {
            $record = $model->create($request->validated());

            if ($record) {
                return $this->response('Sub Department successfully added.', $record->with('department'), true);
            } else {
                return $this->response('Sub Department cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show(SubDepartment $SubDepartment)
    {
        return $SubDepartment->with('department');
    }

    public function update(SubDepartmentUpdateRequest $request, SubDepartment $SubDepartment)
    {
        try {
            $record = $SubDepartment->update($request->validated());

            if ($record) {
                return $this->response('Sub Department successfully updated.', $SubDepartment->with('department'), true);
            } else {
                return $this->response('Sub Department cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function destroy(SubDepartment $SubDepartment)
    {
        try {
            $record = $SubDepartment->delete();

            if ($record) {
                return $this->response('Sub Department successfully deleted.', null, true);
            } else {
                return $this->response('Sub Department cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function deleteSelected(SubDepartment $model, Request $request)
    {
        try {
            $record = $model->whereIn('id', $request->ids)->delete();

            if ($record) {
                return $this->response('Sub Department successfully deleted.', null, true);
            } else {
                return $this->response('Sub Department cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function sub_departments_by_department(SubDepartment $model, Request $request)
    {
        return $model->where('department_id', $request->department_id)->get();
    }

    public function sub_departments_by_departments(SubDepartment $model, Request $request)
    {


        return $model->whereIn('department_id', $request->department_ids ?? [])->get();
    }
}
