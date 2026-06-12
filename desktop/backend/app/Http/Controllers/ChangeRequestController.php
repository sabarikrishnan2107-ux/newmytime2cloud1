<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangeRequest\StoreRequest;
use App\Http\Requests\ChangeRequest\UpdateRequest;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\ChangeRequest;
use App\Models\Employee;
use App\Models\Notification;
use App\Services\Notify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChangeRequestController extends Controller
{
    public function index(Request $request)
    {
        $model = ChangeRequest::query();

        $model->where("company_id", $request->company_id);
        $model->when($request->filled("employee_device_id"), fn($q) => $q->where('employee_device_id', $request->employee_device_id));
        $model->when($request->filled("UserID"), fn($q) => $q->where('employee_device_id', $request->employee_device_id));
        $model->when($request->filled("request_type"), fn($q) => $q->where('request_type', $request->request_type));
        $model->when($request->filled("status"), fn($q) => $q->where('status', $request->status));
        $model->when($request->filled("branch_id"), function ($query) {
            $query->whereHas("employee", fn($q) => $q->where('branch_id', request("branch_id")));
        });

        $model->when($request->filled("status_ids"), fn($q) => $q->whereIn('status', $request->status_ids));

        $model->when($request->filled("branch_ids"), function ($query) {
            $query->whereHas("employee", fn($q) => $q->whereIn('branch_id', request("branch_ids")));
        });

        $model->when($request->filled("department_ids"), function ($query) {
            $query->whereHas("employee", fn($q) => $q->whereIn('department_id', request("department_ids")));
        });


        $model->when($request->filled('search'), function ($q) use ($request) {
            $q->whereHas('employee',  function ($qu) use ($request) {
                $searchTerm = "{$request->search}%";

                $qu->where('system_user_id', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                    ->orWhere('employee_id', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                    ->orWhere('first_name', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                    ->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', $searchTerm);
            });
        });

        $model->with(["branch", "employee"]);

        $model->orderBy("id", "desc");

        return $model->paginate($request->per_page ?? 100);
    }

    public function store(StoreRequest $request)
    {
        try {
            $data = $request->validated();
            if (isset($request->attachment) && $request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $ext = $file->getClientOriginalExtension();
                $fileName = time() . '.' . $ext;
                $request->file('attachment')->move(public_path('/ChangeRequest/attachments'), $fileName);
                $data['attachment'] = $fileName;
            }

            $record = ChangeRequest::create($data);

            if ($record) {
                return $this->response('ChangeRequest created.', $record, true);
            } else {
                return $this->response('ChangeRequest cannot create.', null, false);
            }
        } catch (\Throwable $th) {
            throw $th;
        }
    }

    public function show(ChangeRequest $ChangeRequest)
    {
        return $ChangeRequest->load(["branch", "employee"]);
    }

    public function update(ChangeRequest $ChangeRequest, UpdateRequest $request)
    {
        try {
            if (in_array($ChangeRequest->status, ["A", "R", 1, 2, "approved", "rejected"], true)) {
                return $this->response('Only pending change requests can be edited.', null, false);
            }

            $data = $request->validated();

            if (isset($request->attachment) && $request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $ext = $file->getClientOriginalExtension();
                $fileName = time() . '.' . $ext;
                $request->file('attachment')->move(public_path('/ChangeRequest/attachments'), $fileName);
                $data['attachment'] = $fileName;
            }

            $updated = $ChangeRequest->update($data);

            if ($updated) {
                return $this->response('ChangeRequest updated.', $ChangeRequest->fresh()->load(["branch", "employee"]), true);
            }

            return $this->response('ChangeRequest cannot update.', null, false);
        } catch (\Throwable $th) {
            return $this->response('An error occurred while updating the ChangeRequest.', null, false);
        }
    }

    public function updateChangeRequest($id, UpdateRequest $request)
    {
        try {
            // Validate the request data using the UpdateRequest rules
            $data = $request->all();

            $status = $data['status'];

            // DEBUG: log who's approving so we can see why approved_by ends up null
            file_put_contents(
                storage_path('logs/change_request_debug.log'),
                '[' . date('Y-m-d H:i:s') . '] id=' . $id
                    . ' status=' . $status
                    . ' approver_user_id=' . ($data['approver_user_id'] ?? 'NULL')
                    . ' auth_id=' . (auth()->id() ?? 'NULL')
                    . ' bearer=' . ($request->bearerToken() ? 'present' : 'missing')
                    . PHP_EOL,
                FILE_APPEND
            );

            // Start a database transaction
            DB::beginTransaction();

            // Update Attendance records

            // A status = Approve from change request table
            if ($status == "A") {

                Attendance::where('company_id', $data['company_id'])
                    ->where('employee_id', $data['employee_device_id'])
                    ->whereBetween('date', [$data['from_date'], $data['to_date']])
                    ->update(['status' => "P"]);

                // Also create the actual punch entries the employee asked for
                // so the manual log shows up on the timeline / reports.
                // approver_user_id is sent explicitly from the frontend so this
                // works even when the route isn't behind auth:sanctum.
                $this->createAttendanceLogsFromRequest($id, $data, $data['approver_user_id'] ?? null);
            }

            // Update the ChangeRequest
            $record = ChangeRequest::where('id', $id)->update(['status' => $status]);

            // Commit the transaction if all operations are successful
            DB::commit();

            if ($record) {

                $employee = Employee::where("system_user_id", $data['employee_device_id'])->where("company_id", $data['company_id'])->first();

                Notification::create([
                    "data" => "Attendance request has been updated",
                    "action" => "Attendance Request",
                    "model" => "Attendance",
                    "user_id" => $employee->user_id ?? 0,
                    "company_id" => $data['company_id'],
                    "redirect_url" => "change_requests"
                ]);

                $clientId = $data['company_id'] . "_" . $employee->id;

                $statusResult = $status == "A" ? "Approved" : "Rejected";

                Notify::push($clientId, "change_request", "Attendance request has been $statusResult");

                return $this->response('ChangeRequest updated.', $clientId, true);
            } else {
                return $this->response('ChangeRequest cannot update.', null, false);
            }
        } catch (\Throwable $th) {
            // Roll back the transaction in case of an error
            DB::rollBack();

            return $this->response('An error occurred while updating the ChangeRequest.', null, false);
        }
    }


    public function destroy(ChangeRequest $ChangeRequest)
    {
        if ($ChangeRequest->delete()) {
            return $this->response('ChangeRequest successfully deleted.', null, true);
        } else {
            return $this->response('ChangeRequest cannot delete.', null, false);
        }
    }

    /**
     * Create AttendanceLog entries from an approved change request.
     * Pulls from_time / to_time off the request and emits up to two punches
     * (IN at from_date+from_time, OUT at to_date+to_time) tagged DeviceID=Manual.
     */
    private function createAttendanceLogsFromRequest($id, array $data, $explicitApproverId = null): void
    {
        $cr = ChangeRequest::find($id);
        if (!$cr) return;

        $companyId = $cr->company_id ?? ($data['company_id'] ?? null);
        $userId    = $cr->employee_device_id ?? ($data['employee_device_id'] ?? null);
        if (!$companyId || !$userId) return;

        // Prefer explicit id from the frontend (works without auth:sanctum), fall back to auth()->id().
        $approver = $explicitApproverId ? (int) $explicitApproverId : (auth()->id() ?: null);
        $today    = date('Y-m-d');
        $reason   = $cr->remarks ?? ($data['remarks'] ?? null);

        $normalizeTime = function ($t) {
            if (!$t) return null;
            $t = trim((string) $t);
            if ($t === '' || $t === '00:00:00' || $t === '00:00') return null;
            // accept HH:MM or HH:MM:SS
            if (preg_match('/^\d{1,2}:\d{2}$/', $t)) return $t . ':00';
            if (preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $t)) return $t;
            return null;
        };

        $fromTime = $normalizeTime($cr->from_time ?? null);
        $toTime   = $normalizeTime($cr->to_time ?? null);

        $createLog = function ($date, $time, $logType) use ($userId, $companyId, $approver, $today, $reason) {
            if (!$time) return;
            $logTime = $date . ' ' . $time;
            $existing = AttendanceLog::where('UserID', $userId)
                ->where('LogTime', $logTime)
                ->where('DeviceID', 'Manual')
                ->first();
            $payload = [
                'UserID'      => $userId,
                'LogTime'     => $logTime,
                'DeviceID'    => 'Manual',
                'company_id'  => $companyId,
                'log_type'    => $logType,
                'log_date'    => $today,
                'approved_by' => $approver,
                'reason'      => $reason,
            ];
            if ($existing) {
                $existing->update($payload);
            } else {
                AttendanceLog::create($payload);
            }
        };

        $fromDate = $cr->from_date ? date('Y-m-d', strtotime($cr->from_date)) : ($data['from_date'] ?? null);
        $toDate   = $cr->to_date   ? date('Y-m-d', strtotime($cr->to_date))   : ($data['to_date']   ?? $fromDate);

        if ($fromDate) $createLog($fromDate, $fromTime, 'In');
        if ($toDate)   $createLog($toDate,   $toTime,   'Out');
    }
}
