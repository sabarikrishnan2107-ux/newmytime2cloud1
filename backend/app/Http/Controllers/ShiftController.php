<?php

namespace App\Http\Controllers;

use App\Http\Requests\Shift\StoreRequest;
use App\Http\Requests\Shift\UpdateRequest;
use App\Http\Requests\Shift\UpdateSingleShiftRequest;
use App\Models\AutoShift;
use App\Models\CompanyBranch;
use App\Models\Shift;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $model = Shift::query();
        $model->with(["shift_type", "branch"]);
        $model->where('company_id', $request->company_id);

        // $model->when(request()->filled("branch_id"), function ($query) use ($request) {
        //     return $query->where('branch_id', $request->branch_id);
        // });

        $model->withCount(["autoshift" => function ($q) use ($request) {
            return $q->where("company_id", $request->company_id);
        }]);

        $model->when($request->filled('search'), function ($q) use ($request) {
            $q->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->search%");
            $q->orwhereHas('shift_type', fn(Builder $query) => $query->where('name', 'LIKE', "$request->search%"));
            $q->orwhereHas('branch', fn(Builder $query) => $query->where('branch_name', 'LIKE', "$request->search%"));
            $q->where("company_id", $request->company_id);
        });

        return $model->paginate($request->per_page);
    }
    public function shiftDropdownlist(Request $request)
    {
        $model = Shift::query();
        $model->with(["shift_type", "branch"]);
        $model->where('company_id', $request->company_id);

        // $model->when(request()->filled("branch_id"), function ($query) use ($request) {
        //     return $query->where('branch_id', $request->branch_id);
        // });

        $model->withCount(["autoshift" => function ($q) use ($request) {
            return $q->where("company_id", $request->company_id);
        }]);

        $model->when($request->filled('search'), function ($q) use ($request) {
            $q->where('name', env('WILD_CARD') ?? 'ILIKE', "$request->search%");
            $q->orwhereHas('shift_type', fn(Builder $query) => $query->where('name', 'LIKE', "$request->search%"));
            $q->orwhereHas('branch', fn(Builder $query) => $query->where('branch_name', 'LIKE', "$request->search%"));
            $q->where("company_id", $request->company_id);
        });

        return $model->get();
    }
    public function list_with_out_multi_in_out(Request $request)
    {
        $model = Shift::query();
        $model->whereHas("shift_type", function ($q) {
            $q->where("id", "!=", 2);
        });
        $model->with("shift_type");
        $model->where('company_id', $request->company_id);
        return $model->paginate($request->per_page);
    }

    public function shift_by_type(Request $request)
    {
        return Shift::with("shift_type")->where("company_id", $request->company_id)->where("shift_type_id", $request->shift_type_id)->get();
    }

    public function shift_by_types(Request $request)
    {
        return Shift::with("shift_type")->where("company_id", $request->company_id)->whereIn("shift_type_id", [4, 5, 6])->get();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function shiftValidate(StoreRequest $request, Shift $model)
    {
        return $request->validated();
    }

    public function store(StoreRequest $request, Shift $model)
    {
        if ($request->shift_type_id == 3) {
            return $this->processAutoShift($request->shift_ids);
        }

        try {
            $record = $model->create($request->validated());

            if ($record) {
                return $this->response('Shift successfully added.', $record, true);
            } else {
                return $this->response('Shift cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function processAutoShift($shift_ids)
    {
        $arr = [];

        foreach ($shift_ids as $shift_id) {
            $arr[] = [
                "shift_id" => $shift_id,
            ];
        }

        try {
            $record = AutoShift::insert($arr);

            if ($record) {
                return $this->response('Shift successfully added.', $record, true);
            } else {
                return $this->response('Shift cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Shift  $Shift
     * @return \Illuminate\Http\Response
     */
    public function show(Shift $Shift)
    {
        return $Shift;
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Shift  $Shift
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateRequest $request, Shift $Shift)
    {
        try {
            $record = $Shift->update($request->validated());

            if ($record) {
                return $this->response('Shift successfully updated.', $record, true);
            } else {
                return $this->response('Shift cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Shift  $Shift
     * @return \Illuminate\Http\Response
     */
    public function destroy(Shift $Shift)
    {
        try {
            if ($Shift->delete()) {
                return $this->response('Shift successfully updated.', null, true);
            } else {
                return $this->response('Shift cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function getShift(Request $request)
    {
        return $model = Shift::where('id', $request->id)->find($request->id)->makeHidden('shift_type');
        $model->where('company_id', $request->company_id);
        return $model->paginate($request->per_page);
    }

    public function updateSingleShift(UpdateSingleShiftRequest $request)
    {
        try {
            $model = Shift::find($request->id);
            $data = $request->validated();
            $data['shift_type_id'] = 2;
            $record = $model->update($data);
            if ($record) {
                return $this->response('Shift successfully updated.', $record, true);
            } else {
                return $this->response('Shift cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function shiftBurkInsert($id)
    {
        // "branch_id": 54, //dynamic

        $shift = Shift::withOut("shift_type")->select(
            "name",
            "shift_type_id",
            "working_hours",
            "overtime_interval",
            "on_duty_time",
            "off_duty_time",
            "company_id",
            "branch_id",
            "from_date",
            "to_date",
            "weekend1",
            "weekend2",
            "monthly_flexi_holidays",
            "isAutoShift",
            "days",

        )->find($id);

        $branchIds = [
            31,
            27,
            28,
            29,
            30,
            32,
            33,
            34,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            50,
            51,
            52,
            53,
            55,
            56,
            57,
            58,
            59,
            60,
            61,
            62,
            63,
            64,
            65,
            66
        ];
        $records = [];
        foreach ($branchIds as $branchId) {
            $records[] = [
                "branch_id" => $branchId,
                "name" => $shift->name,
                "shift_type_id" => $shift->shift_type_id,
                "working_hours" => $shift->working_hours,
                "overtime_interval" => $shift->overtime_interval,
                "on_duty_time" => $shift->on_duty_time,
                "off_duty_time" => $shift->off_duty_time,
                "company_id" => $shift->company_id,
                "from_date" => $shift->from_date,
                "to_date" => $shift->to_date,
                "weekend1" => $shift->weekend1,
                "weekend2" => $shift->weekend2,
                "monthly_flexi_holidays" => $shift->monthly_flexi_holidays,
                "isAutoShift" => $shift->isAutoShift,
                "days" => json_encode($shift->days),
            ];
        }

        Shift::insert($records);

        return Shift::where('company_id', 22)->count();
    }
}
