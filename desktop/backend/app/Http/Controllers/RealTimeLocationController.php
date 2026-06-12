<?php

namespace App\Http\Controllers;

use App\Http\Requests\RealTimeLocation\StoreRequest;
use App\Models\Employee;
use App\Models\RealTimeLocation;
use App\Services\Notify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RealTimeLocationController extends Controller
{
    public function index(Request $request)
    {
        if (! $request->filled('company_id')) {
            return response()->json([
                'status'  => false,
                'message' => 'company_id is required',
            ], 422);
        }

        $companyId = (int) $request->company_id;

        // Single-user trail mode: return ordered pings for that user on one day.
        if ($request->filled('UserID')) {
            $date = $request->date ?? date('Y-m-d');
            return RealTimeLocation::query()
                ->where('company_id', $companyId)
                ->where('UserID', $request->UserID)
                ->where('date', $date)
                ->orderBy('id', 'asc')
                ->paginate($request->per_page ?? 100);
        }

        // Live-tracker mode: latest ping per user for the company.
        // When `date` is supplied, restrict to that day; otherwise return the most
        // recent row per user regardless of age so stale pings still appear.
        $latestIdsQuery = RealTimeLocation::query()
            ->selectRaw('MAX(id) as id')
            ->where('company_id', $companyId)
            ->groupBy('UserID');

        if ($request->filled('date')) {
            $latestIdsQuery->where('date', $request->date);
        }

        $latestIds = $latestIdsQuery->pluck('id');

        $rows = RealTimeLocation::query()
            ->whereIn('id', $latestIds)
            ->orderBy('id', 'desc')
            ->get();

        $userIds = $rows->pluck('UserID')->filter()->unique()->values();
        $employees = Employee::where('company_id', $companyId)
            ->whereIn('system_user_id', $userIds)
            ->with(['branch:id,branch_name', 'department:id,name'])
            ->get(['system_user_id', 'profile_picture', 'first_name', 'last_name', 'branch_id', 'department_id'])
            ->keyBy('system_user_id');

        return $rows->map(function ($row) use ($employees) {
            $data = $row->toArray();
            $emp = $employees[$row->UserID] ?? null;
            $data['avatar'] = $emp?->profile_picture;
            $data['first_name'] = $emp?->first_name;
            $data['last_name'] = $emp?->last_name;
            $data['branch_id'] = $emp?->branch_id;
            $data['branch_name'] = $emp?->branch?->branch_name;
            $data['department_id'] = $emp?->department_id;
            $data['department_name'] = $emp?->department?->name;
            return $data;
        });
    }

    public function store(StoreRequest $request)
    {
        try {
            $exists = RealTimeLocation::query()
                ->where("company_id", $request->company_id)
                ->where("device_id", $request->device_id)
                ->where("UserID", $request->UserID)
                ->where("latitude", $request->latitude)
                ->where("longitude", $request->longitude)
                ->exists();

            if ($exists) {
                return $this->response('Location already exist.', null, true);
            }

            $loggedAt = $request->filled('logged_at')
                ? date('Y-m-d H:i:s', strtotime($request->logged_at))
                : date('Y-m-d H:i:s');

            $employee = Employee::where('company_id', $request->company_id)
                ->where('system_user_id', $request->UserID)
                ->first(['first_name', 'last_name', 'profile_picture']);

            $fullName = $request->input('full_name');
            if (empty($fullName) && $employee) {
                $fullName = trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''));
            }
            $avatar = $employee?->profile_picture;

            $row = RealTimeLocation::create([
                'company_id' => $request->company_id,
                'UserID'     => $request->UserID,
                'device_id'  => $request->device_id,
                'latitude'   => (string) $request->latitude,
                'longitude'  => (string) $request->longitude,
                'status'     => $request->input('status'),
                'date'       => substr($loggedAt, 0, 10),
                'datetime'   => $loggedAt,
                'full_name'  => $fullName,
                'short_name' => $request->input('short_name'),
            ]);

            $payload = $row->toArray();
            $payload['avatar'] = $avatar;
            Notify::push($row->company_id, "map", "new location recorded", $payload);

            return $this->response('Realtime location added.', null, true);
        } catch (\Throwable $th) {
            \Log::error('realtime_location store failed', ['error' => $th->getMessage()]);
            return $this->response('Realtime location cannot add.', null, false);
        }
    }

    /**
     * Mobile-friendly GPS ingest.
     *
     * Accepts:
     *   {
     *     "employee_id": "<system_user_id>",
     *     "company_id":  <int>,
     *     "latitude":    <number>,
     *     "longitude":   <number>,
     *     "status":      "inside" | "outside",
     *     "logged_at":   "<ISO timestamp>"
     *   }
     *
     * Multi-tenant safety: rejects the request if the employee doesn't belong to the
     * posted company_id, so company A's mobile app cannot write into company B's
     * trail. Works across all companies/branches/departments — the employee lookup
     * inherits whatever branch/dept the employee already has configured.
     */
    public function logLocation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required',
            'company_id'  => 'required|integer',
            'latitude'    => 'required|numeric',
            'longitude'   => 'required|numeric',
            'status'      => 'nullable|string|in:inside,outside',
            'logged_at'   => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $companyId  = (int) $request->company_id;
        $employeeId = (string) $request->employee_id;

        // Tenancy gate — the employee must exist under the posted company.
        $employee = Employee::where('company_id', $companyId)
            ->where('system_user_id', $employeeId)
            ->first(['id', 'system_user_id', 'first_name', 'last_name', 'branch_id', 'department_id', 'profile_picture']);

        if (! $employee) {
            return response()->json([
                'status'  => false,
                'message' => "Employee {$employeeId} not found under company {$companyId}",
            ], 404);
        }

        $loggedAt = $request->filled('logged_at')
            ? date('Y-m-d H:i:s', strtotime($request->logged_at))
            : date('Y-m-d H:i:s');

        $row = RealTimeLocation::create([
            'company_id' => $companyId,
            'UserID'     => $employeeId,
            'device_id'  => 'Mobile-' . $employeeId,
            'latitude'   => (string) $request->latitude,
            'longitude'  => (string) $request->longitude,
            'status'     => $request->status,
            'date'       => substr($loggedAt, 0, 10),
            'datetime'   => $loggedAt,
            'full_name'  => trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? '')),
        ]);

        $payload = $row->toArray();
        $payload['avatar'] = $employee->profile_picture;
        Notify::push($companyId, "map", "new location recorded", $payload);

        return response()->json([
            'status'  => true,
            'message' => 'Location logged.',
            'data'    => [
                'id'          => $row->id,
                'employee_id' => $employeeId,
                'company_id'  => $companyId,
                'branch_id'   => $employee->branch_id,
                'status'      => $row->status,
                'logged_at'   => $row->datetime,
            ],
        ]);
    }

    /**
     * Read back trail rows for one employee on a given day — used by the mobile app
     * (history view) and by admin reports. Same tenancy gate as logLocation.
     */
    public function listLocationLogs(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required',
            'company_id'  => 'required|integer',
            'date'        => 'nullable|date',
            'per_page'    => 'nullable|integer|min:1|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $companyId  = (int) $request->company_id;
        $employeeId = (string) $request->employee_id;

        $exists = Employee::where('company_id', $companyId)
            ->where('system_user_id', $employeeId)
            ->exists();
        if (! $exists) {
            return response()->json([
                'status'  => false,
                'message' => "Employee {$employeeId} not found under company {$companyId}",
            ], 404);
        }

        $date = $request->date ?? date('Y-m-d');

        return RealTimeLocation::where('company_id', $companyId)
            ->where('UserID', $employeeId)
            ->where('date', $date)
            ->orderBy('datetime', 'asc')
            ->paginate($request->per_page ?? 500);
    }
}
