<?php

namespace App\Http\Controllers;

use App\Http\Requests\Roster\StoreRequest;
use App\Http\Requests\Roster\UpdateRequest;
use App\Models\Roster;
use App\Models\ScheduleEmployee;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RosterController extends Controller
{
    public function index(Request $request, Roster $model)
    {
        try {
            return $model
                ->where('company_id', $request->company_id)
                ->when($request->filled('search_shift_name'), function ($q) use ($request) {
                    $key = strtolower($request->search_shift_name);
                    $q->where(DB::raw('lower(name)'), 'LIKE', "$key%");
                })
                ->orderBy('id', 'desc')
                ->paginate($request->per_page ?? 20);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function store(StoreRequest $request)
    {
        try {
            $json = [];
            $days = $request->days;
            $shift_ids = $request->shift_ids;
            $shift_names = $request->shift_names;

            for ($i = 0; $i < count($days); $i++) {
                $shift = Shift::find($shift_ids[$i]);
                $json[] = [
                    "day" => $days[$i],
                    "shift_id" => $shift_ids[$i],
                    "shift_name" => $shift_names[$i],
                    "shift_type_id" => $shift->shift_type->id ?? 0,
                    "time" => isset($shift) ? ($shift->on_duty_time . " - " . $shift->off_duty_time) : "---",
                ];
            }

            $created = Roster::create([
                "shift_type_ids" => array_column($json, 'shift_type_id'),
                "shift_ids" => $shift_ids,
                "days" => $days,
                "json" => $json,
                "name" => $request->name,
                "company_id" => $request->company_id,
            ]);

            if ($created) {
                return $this->response('Schedule successfully added.', $created, true);
            } else {
                return $this->response('Schedule cannot add.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function storeScheduleArrange(Request $request)
    {
        try {
            $empIds = $request->employee_ids;

            // ScheduleEmployee::where("company_id", $request->company_id)->whereIn('employee_id', $empIds)->delete();

            $schedules = $request->schedules;

            $arr = array_map(function ($empId) use ($schedules, $request) {
                return array_map(function ($schedule) use ($empId, $request) {
                    return [
                        'roster_id' => $schedule['schedule_id'],
                        'employee_id' => $empId,
                        'from_date' => $schedule['from_date'],
                        'to_date' => $schedule['to_date'],
                        'isOverTime' => $schedule['is_over_time'],
                        'company_id' => $request->company_id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }, $schedules);
            }, $empIds);

            ScheduleEmployee::insert(array_merge(...$arr));

            (new ScheduleEmployeeController)->assignScheduleByManual($request);

            return $this->response('Schedule successfully added.', null, true);
        } catch (\Throwable $th) {
            return $this->response($th->getMessage(), null, false);
        }
    }

    public function update_old(UpdateRequest $request, Roster $roster)
    {
        $json = [];
        $days = $request->days;
        $shift_ids = $request->shift_ids;
        $shift_names = $request->shift_names;

        for ($i = 0; $i < count($days); $i++) {
            $shift = Shift::find($shift_ids[$i]);
            $json[] = [
                "day" => $days[$i],
                "shift_id" => $shift_ids[$i],
                "shift_name" => $shift_names[$i],
                "time" => isset($shift) ? ($shift->on_duty_time . " - " . $shift->off_duty_time) : "---",
            ];
        }

        $update = $roster->update([
            "json" => $json,
            "name" => $request->name,
            "company_id" => $request->company_id,
        ]);

        if ($update) {
            return $this->response('Schedule successfully update.', $update, true);
        } else {
            return $this->response('Schedule cannot add.', null, false);
        }
    }

    public function update(UpdateRequest $request, Roster $roster)
    {
        $data = $request->json;
        $arr = [];
        foreach ($data as $data) {
            $shift = Shift::find($data['shift_id']);
            $arr[] = [
                "day" => $data['day'],
                "shift_id" => $data['shift_id'],
                "shift_name" => $shift->name ?? '',
                "shift_type_id" => $shift->shift_type->id ?? 0,
                "time" => isset($shift) ? ($shift->on_duty_time . " - " . $shift->off_duty_time) : "---",
            ];
        }

        $update = $roster->update([
            "shift_type_ids" => array_column($arr, 'shift_type_id'),
            "days" => array_column($arr, 'day'),
            "shift_ids" => array_column($arr, 'shift_id'),
            "json" => $arr,
            "name" => $request->name,
            "company_id" => $request->company_id,
        ]);

        if ($update) {
            return $this->response('Schedule successfully update.', $update, true);
        } else {
            return $this->response('Schedule cannot add.', null, false);
        }
    }

    public function destroy(Roster $roster)
    {
        try {
            $record = $roster->delete();
            if ($record) {
                return $this->response('Schedule successfully deleted.', null, true);
            } else {
                return $this->response('Schedule cannot delete.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function getRosterList(Request $request)
    {
        try {
            $model = Roster::query();
            return $model
                ->where('company_id', $request->company_id)
                ->orderBy('id', 'ASC')
                ->get(['id as schedule_id', 'name']);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function scheduleUpdateByEmployee(Request $request, $id)
    {
        ScheduleEmployee::where("company_id", $request->company_id)->where('employee_id', $id)->delete();
        $arr = [];
        $schedules = $request->schedules;
        foreach ($schedules as $schedule) {
            $arr[] = [
                "employee_id" => $id,
                "isOverTime" => $schedule['is_over_time'],
                "roster_id" => $schedule['schedule_id'],
                "from_date" => $schedule['from_date'],
                "to_date" => $schedule['to_date'],
                "company_id" => $request->company_id,
                "branch_id" => $request->branch_id,
                "created_at" => date('Y-m-d H:i:s'),
                "updated_at" => now(),
            ];
        }

        try {
            ScheduleEmployee::insert($arr);
            //(new ScheduleEmployeeController)->assignSchedule($request);

            return $this->response('Schedule successfully Updated.', null, true);
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function test(Request $request, $id)
    {
        $schedules = $request->schedules;
        $ids = collect($schedules)->pluck('id');
        $updatedSchedules = ScheduleEmployee::whereIn('id', $ids)->get();
        $updatedSchedules->each(function ($schedule) use ($schedules) {
            $newData = collect($schedules)->firstWhere('id', $schedule->id);
            $schedule->update([
                "isOverTime" => $newData['is_over_time'],
                "roster_id" => $newData['schedule_id'],
                "from_date" => $newData['from_date'],
                "to_date" => $newData['to_date'],
            ]);
        });
        return $this->response('Schedule successfully Updated.', null, true);
    }
}
