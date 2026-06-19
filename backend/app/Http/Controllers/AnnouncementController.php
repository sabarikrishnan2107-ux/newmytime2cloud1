<?php

namespace App\Http\Controllers;

use App\Http\Requests\Announcement\StoreRequest;
use App\Http\Requests\Announcement\UpdateRequest;
use App\Models\Announcement;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnnouncementController extends Controller
{

    public function index(Request $request)
    {
        return $data = (new Announcement)->filters($request)->paginate($request->per_page ?? 100);

        foreach ($data as $key => $value) {
            return $value->department;
        }
    }

    public function annoucement_list(Request $request)
    {

        return (new Announcement)->filters($request)->with(['category', 'user', 'branch'])->withOut("employees")
            // ->where('start_date', '<=', date("Y-m-d"))
            // ->where('end_date', '>=', date("Y-m-d"))
            ->when($request->filled("branch_id"), function ($q) use ($request) {
                $q->where("branch_id", $request->branch_id);
            })
            ->when($request->filled("department_id") && $request->department_id > 0, function ($q) use ($request) {
                $q->whereHas("employees", fn($q) => $q->where("department_id", $request->department_id));
            })

            ->when($request->filled("branch_ids") && $request->branch_ids > 0, function ($q) use ($request) {
                $q->whereHas("employees", fn($q) => $q->whereIn("branch_id", $request->branch_ids));
            })

            ->when($request->filled("department_ids") && $request->department_ids > 0, function ($q) use ($request) {
                $q->whereHas("employees", fn($q) => $q->whereIn("department_id", $request->department_ids));
            })

            ->paginate(4);
    }

    public function store(StoreRequest $request)
    {
        DB::beginTransaction();

        try {
            $record = Announcement::create([
                'title' => $request->title,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'description' => $request->description,
                'company_id' => $request->company_id,
                'dateTime' => date("d-M-y h:i:sa"),
                'user_id' => $request->user_id,
                'branch_id' => $request->branch_id,
                'category_id' => $request->category_id,


            ]);

            if ($record) {
                // Attach departments and employees
                if (!empty($request->departments)) {
                    // Attach departments
                    $record->departments()->attach($request->departments);
                    DB::commit();
                }
                if (!empty($request->employees)) {
                    $record->employees()->attach($request->employees);
                }
                return $this->response('Announcement Successfully created.', $record, true);
            } else {
                return $this->response('Announcement cannot be created.', null, false);
            }
        } catch (\Throwable $th) {
            DB::rollback();
            throw $th;
        }
    }
    public function update(UpdateRequest $request, Announcement $Announcement)
    {
        try {
            $record = $Announcement->update($request->except('departments', 'employees', 'category', 'user', 'branch'));
            if ($record) {
                if (!empty($request->departments)) {
                    $Announcement->departments()->sync($request->departments);
                }
                if (!empty($request->employees)) {
                    $Announcement->employees()->sync($request->employees);
                }
                return $this->response('Announcement successfully updated.', $record, true);
            } else {
                return $this->response('Announcement cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
    public function destroy(Announcement $Announcement, Request $request)
    {
        $record = $Announcement->delete();
        if ($record) {
            $Announcement->departments()->detach($request->departments);
            $Announcement->employees()->detach($request->employees);

            return $this->response('Announcement successfully deleted.', $record, true);
        } else {
            return $this->response('Announcement cannot delete.', null, false);
        }
    }

    public function deleteSelected(Request $request)
    {
        $record = Announcement::whereIn('id', $request->ids)->delete();
        if ($record) {
            $record->departments()->detach($request->departments);
            $record->employees()->detach($request->employees);

            return $this->response('Announcement Successfully delete.', $record, true);
        } else {
            return $this->response('Announcement cannot delete.', null, false);
        }
    }

    public function getAnnouncement($id)
    {
        $employee = Employee::where('id', $id)->first();
        $start = date("Y-m-d", strtotime(now()));
        $endOfMonthDate = date("Y-m-t", strtotime($start));
        return $employee->announcement()->whereBetween('start_date', [$start, $endOfMonthDate])->get();
    }
}
