<?php

namespace App\Http\Controllers;

use App\Http\Requests\Leavecount\StoreRequest;
use App\Http\Requests\Leavecount\UpdateRequest;
use App\Models\LeaveCount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaveCountController extends Controller
{
    public function getDefaultModelSettings($request)
    {
        $model = LeaveCount::query();
        $model->with(["leave_type", "leave_groups"]);
        $model->where('company_id', $request->company_id);
        $model->where('group_id', $request->group_id);

        // $model->when($request->filled('serach_name'), function ($q) use ($request) {
        //     $key = $request->serach_name;
        //     $q->where('name', env('WILD_CARD') ?? 'ILIKE', "$key%");
        // });
        // $model->when($request->filled('search_short_name'), function ($q) use ($request) {
        //     $key = $request->search_short_name;
        //     $q->where('short_name', env('WILD_CARD') ?? 'ILIKE', "$key%");
        // });

        return $model;
    }

    public function index(Request $request)
    {

        return $this->getDefaultModelSettings($request)->paginate($request->per_page ?? 100);
    }

    function list(Request $request) {
        return $this->getDefaultModelSettings($request)->paginate($request->per_page ?? 100);
    }

    public function store(StoreRequest $request)
    {
        DB::beginTransaction();

        try {
            // Database operations
            $record = LeaveCount::create($request->all());

            DB::commit();
            if ($record) {

                return $this->response('Leave Type Count  Successfully created.', $record, true);
            } else {
                return $this->response('Leave Type  Count cannot be created.', null, false);
            }
        } catch (\Throwable $th) {
            DB::rollback();
            throw $th;
        }
    }
    public function update(UpdateRequest $request, $id)
    {

        try {
            $record = LeaveCount::find($id)->update($request->all());

            if ($record) {

                return $this->response('Leave Type Count successfully updated.', $record, true);
            } else {
                return $this->response('Leave Type Count cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
    public function destroy($id)
    {

        if (LeaveCount::find($id)->delete()) {

            return $this->response('LeaveCount Count successfully deleted.', null, true);
        } else {
            return $this->response('LeaveCount Count cannot delete.', null, false);
        }
    }
    public function search(Request $request, $key)
    {
        return $this->getDefaultModelSettings($request)->where('title', 'LIKE', "%$key%")->paginate($request->per_page ?? 100);
    }
    public function deleteSelected(Request $request)
    {
        $record = LeaveCount::whereIn('id', $request->ids)->delete();
        if ($record) {

            return $this->response('LeaveCount Successfully delete.', $record, true);
        } else {
            return $this->response('LeaveCount cannot delete.', null, false);
        }
    }

}
