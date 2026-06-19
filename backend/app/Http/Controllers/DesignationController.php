<?php

namespace App\Http\Controllers;

use App\Http\Requests\Designation\DesignationRequest;
use App\Http\Requests\Designation\DesignationUpdateRequest;
use App\Models\Department;
use App\Models\Designation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class DesignationController extends Controller
{
    public function dropdownList()
    {
        $model = Designation::query();
        $model->where('company_id', request('company_id'));
        $model->when(request()->filled('branch_id'), fn ($q) => $q->where('branch_id', request('branch_id')));
        $model->orderBy(request('order_by') ?? "id", request('sort_by_desc') ? "desc" : "asc");
        return $model->get(["id", "name"]);
    }

    public function index(Designation $model, Request $request)
    {

        return $model->with('department')->where('company_id', $request->company_id)
            ->when($request->filled('designation_name'), function ($q) use ($request) {
                $q->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->designation_name%");
            })
            ->when($request->filled('department_name'), function ($q) use ($request) {
                $q->whereHas('department', fn (Builder $query) => $query->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->department_name%"));
            })
            ->when($request->filled('sortBy'), function ($q) use ($request) {
                $sortDesc = $request->input('sortDesc');
                if (strpos($request->sortBy, '.')) {
                    if ($request->sortBy == 'department.name') {
                        $q->orderBy(Department::select("name")->whereColumn("departments.id", "designations.department_id"), $sortDesc == 'true' ? 'desc' : 'asc');
                    }
                } else {
                    $q->orderBy($request->sortBy . "", $sortDesc == 'true' ? 'desc' : 'asc'); {
                    }
                }
            })
            ->orderBy("id","desc")
            ->paginate($request->per_page);
    }

    public function designations_by_department(Designation $model, Request $request)
    {
        return $model->where('department_id', $request->department_id)->get();
    }

    public function search(Designation $model, Request $request, $key)
    {
        $model = $this->FilterCompanyList($model, $request);

        $model->where('id', 'LIKE', "%$key%");

        $model->orWhere('name', 'LIKE', "%$key%");

        $model->with('department');

        return $model->paginate($request->per_page);
    }

    public function store(Designation $model, DesignationRequest $request)
    {
        $data = $request->validated();

        if ($request->company_id) {
            $data["company_id"] = $request->company_id;
        }

        try {
            $record = $model->create($data);

            if ($record) {
                return $this->response('Designation successfully added.', $record, true);
            } else {
                return $this->response('Designation cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show(Designation $Designation)
    {
        return $Designation;
    }

    public function update(DesignationUpdateRequest $request, Designation $Designation)
    {
        try {
            $record = $Designation->update($request->validated());

            if ($record) {
                return $this->response('Designation successfully updated.', $Designation, true);
            } else {
                return $this->response('Designation cannot updated.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function destroy(Designation $Designation)
    {
        try {
            $record = $Designation->delete();

            if ($record) {
                return $this->response('Designation successfully deleted.', $Designation, true);
            } else {
                return $this->response('Designation cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function deleteSelected(Request $request)
    {
        try {
            $record = Designation::whereIn('id', $request->ids)->delete();

            if ($record) {
                return $this->response('Designation successfully deleted.', null, true);
            } else {
                return $this->response('Designation cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
}
