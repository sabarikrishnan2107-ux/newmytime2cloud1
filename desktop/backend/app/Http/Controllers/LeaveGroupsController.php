<?php

namespace App\Http\Controllers;

use App\Http\Requests\Leavegroups\StoreRequest;
use App\Http\Requests\Leavegroups\UpdateRequest;
use App\Models\EmployeeLeaves;
use App\Models\LeaveCount;
use App\Models\LeaveGroups;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaveGroupsController extends Controller
{
    public function dropdownList()
    {
        $model = LeaveGroups::query();
        $model->where('company_id', request('company_id'));
        $model->when(request()->filled('branch_id'), fn($q) => $q->where('branch_id', request('branch_id')));
        $model->select("id", "group_name as name");
        $model->orderBy(request('order_by') ?? "id", request('sort_by_desc') ? "desc" : "asc");
        return $model->get(["id", "name"]);
    }
    public function getDefaultModelSettings($request, $id = '')
    {
        $model = LeaveGroups::query();
        $model->where('company_id', $request->company_id);
        $model->when($request->filled('branch_id'), fn($q) => $q->where('branch_id',  $request->branch_id));
        if ($id > 0) {
            $model->where('id', $id);
        }
        $model->with(["leave_count.leave_type", "branch"]);
        $model->orderByDesc("id");
        return $model;
    }

    public function index(Request $request)
    {

        return $this->getDefaultModelSettings($request)->paginate($request->per_page ?? 100);
    }

    public function getLeaveGroupById(Request $request, $id)
    {
        return $this->getDefaultModelSettings($request)->paginate($request->per_page ?? 100);
    }


    public function show($id, Request $request)
    {
        $year = date("Y");

        $leaveGroup = LeaveGroups::with(['leave_count.leave_type'])->findOrFail($id);

        // Check if employee_id is provided
        if ($request->filled('employee_id')) {
            $employeeId = $request->employee_id;
            $companyId = $request->company_id;

            foreach ($leaveGroup->leave_count as $leaveCount) {
                // Fetch all leaves of the current leave type for the employee
                $leaves = EmployeeLeaves::where('company_id', $companyId)
                    ->where('leave_type_id', $leaveCount->leave_type_id)
                    ->where('employee_id', $employeeId)
                    ->where('status', 1)
                    ->get(['start_date', 'end_date']);

                // Calculate total days used
                $daysUsed = $leaves->sum(function ($leave) {
                    $start = Carbon::parse($leave->start_date);
                    $end = Carbon::parse($leave->end_date);
                    return $start->diffInDays($end) + 1;
                });

                $leaveCount->employee_used = $daysUsed;
                $leaveCount->year = $year;
            }
        }

        return response()->json([$leaveGroup]);
    }


    function list(Request $request)
    {
        return $this->getDefaultModelSettings($request)->paginate($request->per_page ?? 100);
    }

    public function store(StoreRequest $request)
    {
        DB::beginTransaction();

        try {
            // Database operations

            $isExist = LeaveGroups::where('company_id', '=', $request->company_id)->where('group_name', '=', $request->group_name)->first();
            if ($isExist == null) {

                $record = LeaveGroups::create($request->only(['group_name', 'description', 'company_id', 'branch_id']));
                $leaveCountArray = $request->leave_counts;

                foreach ($leaveCountArray as $key => $value) {
                    $leave_count = LeaveCount::where('company_id', $request->company_id)
                        ->where('leave_type_id', $value['id'])
                        ->where('group_id', $record->id);

                    $countData = [
                        "leave_type_count" => $value['leave_type_count'],
                        "accrual" => $value['accrual'] ?? 'monthly',
                        "carry_forward_max" => $value['carry_forward_max'] ?? 0,
                        "max_limit" => $value['max_limit'] ?? 0,
                    ];

                    if ($leave_count->count() != 0) {
                        $leave_count->update($countData);
                    } else {
                        $data = array_merge([
                            "company_id" => $value['company_id'],
                            "leave_type_id" => $value['id'],
                            "group_id" => $record->id,
                        ], $countData);

                        $leave_count->create($data);
                    }
                }

                DB::commit();
                if ($record) {

                    return $this->response('Leave Group  Successfully created.', $record, true);
                } else {
                    return $this->response('Leave Group cannot be created.', null, false);
                }
            } else {
                return $this->response('Leave Group "' . $request->group_name . '" already exist', null, false);
            }
        } catch (\Throwable $th) {
            DB::rollback();
            throw $th;
        }
    }
    public function update(UpdateRequest $request, $id)
    {

        try {
            $isExist = LeaveGroups::where('company_id', '=', $request->company_id)
                ->where('group_name', '=', $request->group_name)
                ->where('id', '!=', $id)
                ->first();
            if ($isExist == null) {

                $record = LeaveGroups::find($id)->update($request->only(['group_name', 'description', 'company_id', 'branch_id']));

                $leaveCountArray = $request->leave_counts;

                foreach ($leaveCountArray as $key => $value) {
                    $leave_count = LeaveCount::where('company_id', $request->company_id)
                        ->where('leave_type_id', $value['id'])
                        ->where('group_id', $id);

                    $countData = [
                        "leave_type_count" => $value['leave_type_count'],
                        "accrual" => $value['accrual'] ?? 'monthly',
                        "carry_forward_max" => $value['carry_forward_max'] ?? 0,
                        "max_limit" => $value['max_limit'] ?? 0,
                    ];

                    if ($leave_count->count() != 0) {
                        $leave_count->update($countData);
                    } else {
                        $data = array_merge([
                            "company_id" => $value['company_id'],
                            "leave_type_id" => $value['id'],
                            "group_id" => $id,
                        ], $countData);

                        $leave_count->create($data);
                    }
                }

                if ($record) {

                    return $this->response('Leave Group successfully updated.', $record, true);
                } else {
                    return $this->response('Leave Group cannot update.', null, false);
                }
            } else {
                return $this->response('Leave Group "' . $request->group_name . '" already exist', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }
    public function destroy(LeaveGroups $LeaveGroups, $id)
    {

        if (LeaveGroups::find($id)->delete()) {

            LeaveCount::where('group_id', '=', $id)->delete();

            return $this->response('Leave Groups   successfully deleted.', null, true);
        } else {
            return $this->response('Leave Groups   cannot delete.', null, false);
        }
    }
    public function search(Request $request, $key)
    {
        return $this->getDefaultModelSettings($request)->where('title', 'LIKE', "%$key%")->paginate($request->per_page ?? 100);
    }
    public function deleteSelected(Request $request)
    {
        $record = LeaveGroups::whereIn('id', $request->ids)->delete();
        if ($record) {

            return $this->response('Leave Groups Successfully delete.', $record, true);
        } else {
            return $this->response('Leave Groups cannot delete.', null, false);
        }
    }

    public function totalLeaveQuota($id, Request $request)
    {
        $company_id = $request->company_id ?? 0;
        $employee_id = $request->employee_id ?? 0;
        $year = $request->year ?? date("Y");

        $payload = LeaveGroups::with("leave_count.leave_type")->withSum('leave_count as total_leave_days', 'leave_type_count')
            ->findOrFail($id);

        $leaveCountArray = $payload->leave_count->toArray();

        $employeeLeaves = EmployeeLeaves::where('company_id', $company_id)
            ->whereIn('leave_type_id', array_column($leaveCountArray, "leave_type_id"))
            ->where('employee_id', $employee_id)
            ->whereYear('created_at', $year)
            ->select(
                DB::raw("COUNT(CASE WHEN status = 0 THEN 1 END) AS pending"),
                DB::raw("COUNT(CASE WHEN status = 1 THEN 1 END) AS approved"),
                DB::raw("COUNT(CASE WHEN status = 2 THEN 1 END) AS rejected"),
            )
            ->groupBy("employee_leaves.id")
            ->first();

        $payload->pending = 0;
        $payload->approved = 0;
        $payload->rejected = 0;
        $payload->balance = 0;

        if ($employeeLeaves) {
            $payload->pending = $employeeLeaves->pending;
            $payload->approved = $employeeLeaves->approved;
            $payload->rejected = $employeeLeaves->rejected;
            $payload->balance = $payload->total_leave_days - $employeeLeaves->approved;
        }

        $payload->year = $year;

        return $payload;
    }

    public function yearlyLeaveQuota($id, Request $request)
    {
        $company_id = $request->company_id ?? 0;
        $employee_id = $request->employee_id ?? 0;
        // Calculate the start and end dates for the last 12 months
        $endDate = now(); // Current date
        $startDate = now()->subMonths(12); // 12 months ago from today

        // Fetch data for the last 12 months
        $leaves = EmployeeLeaves::where('company_id', $company_id)
            ->where('employee_id', $employee_id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where("status", 1)
            ->orderBy('created_at', 'asc')
            ->get();

        $monthNames = [];
        $monthValues = [];

        // Loop through the last 12 months
        for ($i = 0; $i < 12; $i++) {
            $monthStart = now()->subMonths($i)->startOfMonth(); // Start of the month
            $monthEnd = now()->subMonths($i)->endOfMonth(); // End of the month
            $monthName = $monthStart->format('M'); // Format as (Feb)
            $monthlyLeaves = $leaves->filter(function ($item) use ($monthStart, $monthEnd) {
                return $item->created_at >= $monthStart && $item->created_at <= $monthEnd;
            });

            $monthNames[] = $monthName;
            $monthValues[] = $monthlyLeaves->isEmpty() ? 0 : $monthlyLeaves->count();
        }

        return ["month_names" => array_reverse($monthNames), "month_values" => array_reverse($monthValues)];
    }
}
