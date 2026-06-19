<?php
namespace App\Http\Controllers;

use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class EmployeeAccessController extends Controller
{
    public function index(Request $request)
    {

        $model = Employee::query();

        $model = $model->where('company_id', $request->company_id);
        if ($request->user_type == "department") {
            $model->whereHas("department", fn($q) => $q->where("id", $request->department_id));
        }

        $model->orderBy('id', 'desc');

        $model->with([
            "finger_prints",
            "palms",
            "user" => function ($q) {
                return $q->with(["branchLogin", "role"]);
            },
        ])
            ->with([
                "branch",
                "department",
                "designation",
            ])
            ->with("schedule")
            ->where('company_id', $request->company_id)

            ->when($request->filled("branch_id"), function ($q) use ($request) {
                $q->where('branch_id', '=', $request->branch_id);
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                // Add where clause for company_id
                $q->where('company_id', $request->company_id);

                // Add where clauses for various fields using ILIKE for case-insensitive matching
                $q->where(function ($q) use ($request) {
                    //$searchTerm = "%{$request->search}%";
                    $searchTerm = "{$request->search}%";

                    $q->where('system_user_id', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                        ->orWhere('employee_id', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                        ->orWhere('first_name', env('WILD_CARD') ?? 'ILIKE', $searchTerm)
                        ->orWhere('last_name', env('WILD_CARD') ?? 'ILIKE', $searchTerm);
                });
            });

        $model->orderBy('first_name', 'asc');

        $model->select(
            "id",
            "first_name",
            "last_name",
            "profile_picture",
            "phone_number",
            "whatsapp_number",
            "employee_id",
            "joining_date",
            "designation_id",
            "department_id",
            "title",
            "status",
            "company_id",
            "branch_id",
            "system_user_id",
            "display_name",
            "face_uuid",
            "rfid_card_number",
            'rfid_card_password',
            'is_multi_entry_allowed',
            'start_date',
            'start_time',
            'expiry_date',
            'expiry_time',
            'device_id',
            'special_access',
        );

        return $model->paginate($request->per_page ?? 100);
    }

    public function checkUserCode(Request $request)
    {
        $request->validate([
            'pin'                    => ['required', 'digits_between:1,10'], // only digits, length 1-10
            'employee_id'            => ['required', 'integer', 'exists:employees,id'],
            'device_id'              => ['required', 'string', 'max:50'],
            'is_multi_entry_allowed' => ['required', 'boolean'],
            'start_date'             => ['required', 'date', 'after_or_equal:today', 'before_or_equal:expiry_date'],
            'start_time'             => ['required', 'date_format:H:i'],
            'expiry_date'            => ['required', 'date', 'after_or_equal:start_date'],
            'expiry_time'            => ['required', 'date_format:H:i'],
        ]);

        $employee = Employee::find($request->employee_id);

        if (! $employee) {

            return response()->json([
                'success' => false,
                'message' => 'Employee not found.',
            ], 404);
        }

        // ✅ Check if this pin exists for another employee in the same company
        $existing = Employee::where('company_id', $employee->company_id)
            ->where('rfid_card_password', $request->pin)
            ->where('id', '!=', $employee->id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Pin already exists for another employee.',
            ], 409);
        }

        $payload = [
            'rfid_card_password'     => $request->pin,
            'is_multi_entry_allowed' => $request->is_multi_entry_allowed,
            'start_date'             => $request->start_date,
            'start_time'             => $request->start_time,
            'expiry_date'            => $request->expiry_date,
            'expiry_time'            => $request->expiry_time,
            'device_id'              => $request->device_id,
            'special_access'         => true,
        ];

        // info($payload);

        $employee->update($payload);

        // Combine dates and times into full Carbon instances
        $startDateTime  = Carbon::parse("{$payload['start_date']} {$payload['start_time']}");
        $expiryDateTime = Carbon::parse("{$payload['expiry_date']} {$payload['expiry_time']}");
        $now            = Carbon::now();

        // Use start date/time if it's greater than current time
        // If start date is greater than current date, use 1 year past date
        $expiryForDevice = $startDateTime->greaterThan($now)
            ? $now->copy()->subYear() // 1 year past date
            : $expiryDateTime;

        $url = env('SDK_URL') . "/" . $request->device_id . "/AddPerson";

        $data = [
            "userCode" => $employee->system_user_id,
            "name"     => "{$employee->first_name} {$employee->last_name}",
            "password" => $payload["rfid_card_password"],
            "expiry" => "{$payload['expiry_date']} {$payload['expiry_time']}:00", // 2023-01-01 00:00:00
            "expiry" => $expiryForDevice->format('Y-m-d H:i:s'),                  // 2023-01-01 00:00:00
        ];

        try {
            // Make the HTTP request with a 10-second timeout
            $response = Http::timeout(10)->post($url, $data);

            // Check if the response was successful (HTTP 200–299)
            if ($response->successful()) {
                $json = $response->json();

                // Safely get the status from JSON, defaulting to 500 if missing
                $status = $json['status'] ?? 500;

                return response()->json([
                    'success' => $status == 200,
                    'message' => $status == 200
                        ? 'Pin created successfully'
                        : 'Failed to create pin. Device responded with error.',
                    'status'  => $status,
                    'json'    => $json,
                ], 200); // ✅ Always return HTTP 200 to your frontend for predictable handling
            }

            // Handle failed HTTP responses (like 400, 500, etc.)
            return response()->json([
                'success' => false,
                'message' => 'Failed to create pin. Device responded with error.',
                'status'  => $response->status(),
                'json'    => $response->json(),
            ], $response->status() ?: 500);

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            // ✅ Handle connection timeouts separately
            return response()->json([
                'success' => false,
                'message' => 'Connection timed out or device not reachable.',
                'error'   => $e->getMessage(),
                'status'  => 500,
            ], 500);

        } catch (\Exception $e) {
            // ✅ Catch any other errors
            return response()->json([
                'success' => false,
                'message' => 'Failed to create pin. An unexpected error occurred.',
                'error'   => $e->getMessage(),
                'status'  => 500,
            ], 500);
        }

    }
}
