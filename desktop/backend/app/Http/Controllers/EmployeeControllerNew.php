<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateEmployeeContactsRequest;
use App\Models\AttendanceLog;
use App\Models\BankInfo;
use App\Models\DocumentInfo;
use App\Models\EmiratesInfo;
use App\Models\Employee;
use App\Models\Passport;
use App\Models\Qualification;
use App\Models\ScheduleEmployee;
use App\Models\User;
use App\Models\Visa;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// Import Str facade for helper functions

class EmployeeControllerNew extends Controller
{

    public function storeNew(Request $request)
    {
        $employee = [
            "employee_id" => $request->employee_id,
            "company_id"  => $request->company_id,
        ];

        $employeeDevice = [
            "system_user_id" => $request->system_user_id,
            "company_id"     => $request->company_id,
        ];

        $controller = new Controller;
        try {
            // 1. Validate the incoming request data
            $validatedData = $request->validate([
                'title'                => 'nullable|string|max:10',
                'first_name'           => 'required|string|max:100',
                'last_name'            => 'required|string|max:100',
                'full_name'            => 'required|string|max:255',
                'display_name'         => 'nullable|string|max:255',
                'employee_id'          => ['required', 'max:16', $controller->uniqueRecord("employees", $employee)],
                'system_user_id'       => ['required', 'digits_between:1,16', 'numeric', $controller->uniqueRecord('employees', $employeeDevice)],
                'branch_id'            => 'required|integer',                       // Assumes a 'branches' table
                'department_id'        => 'required|integer|exists:departments,id', // Assumes a 'departments' table
                'designation_id'        => 'required|integer|exists:designations,id', // Assumes a 'departments' table
                'joining_date'         => 'required|date',
                'phone_number'         => 'nullable|string|max:20',
                'whatsapp_number'      => 'nullable|string|max:20',
                'company_id'           => 'required|integer', // Assumes a 'branches' table
                'profile_image_base64' => 'nullable|string',  // Con

                'email' => 'nullable|string',
                'password' => 'nullable|string',

                'marital_status' => 'nullable|string',

                'gender' => 'nullable|string',
                'date_of_birth' => 'required|string',
                'nationality' => 'nullable|string',
                'religion' => 'nullable|string',
                'blood_group' => 'nullable|string',

                'employee_type' => 'nullable|string',
                'rfid_card_number' => 'nullable|string',

            ]);

            $validatedData["joining_date"] = date("Y-m-d", strtotime($validatedData["joining_date"]));
            $validatedData["date_of_birth"] = date("Y-m-d", strtotime($validatedData["date_of_birth"]));
            $validatedData["password"] = Hash::make($validatedData["password"]);


            $dataToStore = $validatedData;
            $imagePath   = null;

            // Handle Base64 Image Decoding and Storage
            if (! empty($validatedData['profile_image_base64'])) {

                $base64Image = $validatedData['profile_image_base64'];

                // 1. Separate the file data from the MIME type prefix (e.g., 'data:image/png;base64,')
                if (Str::startsWith($base64Image, 'data:')) {
                    list($type, $base64Image) = explode(';', $base64Image);
                    list(, $base64Image)      = explode(',', $base64Image);
                }

                // 2. Decode the Base64 string into binary data
                $imageData = base64_decode($base64Image);

                // 3. Determine the file extension (simple approach, refine if needed)
                // We'll assume PNG or JPG for simplicity, or try to extract from MIME type.
                // A safer way is to infer the extension, but using a default works for now.
                $ext = '.png'; // Default extension
                if (isset($type) && str_contains($type, 'jpeg')) {
                    $ext = '.jpg';
                }

                // 4. Create the unique file name, similar to your old way
                $fileName = time() . '_' . Str::random(10) . $ext;

                // 5. Define the target directory path
                $targetDir = public_path('media/employee/profile_picture/');

                // Ensure the directory exists
                if (! is_dir($targetDir)) {
                    mkdir($targetDir, 0777, true);
                }

                // 6. Save the binary data to the file path
                $imagePath = $targetDir . $fileName;
                file_put_contents($imagePath, $imageData);

                // 7. Store the file name in the data array for the database
                $dataToStore['profile_picture'] = $fileName;
            }

            // Remove the Base64 string before creating the record
            unset($dataToStore['profile_image_base64']);

            // Remove email and password from employee data (they belong to User model)
            $email = $dataToStore['email'] ?? null;
            $password = $dataToStore['password'] ?? null;
            unset($dataToStore['email']);
            unset($dataToStore['password']);

            // 8. Create the Employee record
            $employee = Employee::create($dataToStore);

            // 9. Create User record if email and password are provided
            $user = null;
            if (!empty($email) && !empty($password)) {
                // Check if user with this email already exists
                $existingUser = User::where('email', $email)->first();

                if ($existingUser) {
                    // Update existing user and link to new employee
                    $existingUser->update([
                        'password' => $password,
                        'employee_id' => $employee->id,
                        "company_id" => $employee->company_id,
                        "user_type" => "employee",
                    ]);
                    $user = $existingUser;
                } else {
                    // Create new user
                    $user = User::create([
                        'name' => $employee->full_name ?? $employee->first_name . ' ' . $employee->last_name,
                        'email' => $email,
                        'password' => $password, // Already hashed above
                        'employee_id' => $employee->id,
                        "company_id" => $employee->company_id,
                        "user_type" => "employee",
                    ]);
                }

                // Update employee with user_id
                $employee->update(['user_id' => $user->id]);
                $employee->refresh();
            }

            // 10. Return a successful response
            return response()->json([
                'message'  => 'Employee created successfully!',
                'employee' => $employee,
                'user' => $user,
            ], 201);
        } catch (ValidationException $e) {

            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while creating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }



    public function updateProfilePicture(Request $request)
    {
        try {
            // 1. Find employee
            $employee = Employee::findOrFail($request->id);

            // 2. Validate incoming data
            $validatedData = $request->validate([
                'profile_image_base64' => 'nullable|string', // Con
            ]);

            $imagePath    = null;

            // 3. Handle Base64 Image if provided
            if (! empty($validatedData['profile_image_base64'])) {
                $base64Image = $validatedData['profile_image_base64'];

                // Separate MIME and data
                if (Str::startsWith($base64Image, 'data:')) {
                    list($type, $base64Image) = explode(';', $base64Image);
                    list(, $base64Image)      = explode(',', $base64Image);
                }

                $imageData = base64_decode($base64Image);

                $ext = '.png';
                if (isset($type) && str_contains($type, 'jpeg')) {
                    $ext = '.jpg';
                }

                $fileName  = time() . '_' . Str::random(10) . $ext;
                $targetDir = public_path('media/employee/profile_picture/');

                if (! is_dir($targetDir)) {
                    mkdir($targetDir, 0777, true);
                }

                $imagePath = $targetDir . $fileName;
                file_put_contents($imagePath, $imageData);

                // Delete old image if exists
                if ($employee->profile_picture && file_exists($targetDir . $employee->profile_picture)) {
                    unlink($targetDir . $employee->profile_picture);
                }

                $dataToUpdate['profile_picture'] = $fileName;
            }

            unset($dataToUpdate['profile_image_base64']);

            // 4. Update the record
            $employee->update($dataToUpdate);

            // 5. Return success response
            return response()->json([
                'message'  => 'Employee updated successfully!',
                'employee' => $employee,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updateNew(Request $request, $id)
    {
        try {
            // 1. Find employee
            $employee = Employee::findOrFail($id);

            $validatedData = $request->validate([
                'title'                => 'nullable|string|max:10',
                'first_name'           => 'required|string|max:100',
                'last_name'            => 'required|string|max:100',
                'full_name'            => 'required|string|max:255',
                'display_name'         => 'nullable|string|max:255',

                'employee_id'          => 'required|string|max:16',
                'system_user_id'       => 'required|string|max:16',


                'branch_id'            => 'required|integer',                       // Assumes a 'branches' table
                'department_id'        => 'required|integer|exists:departments,id', // Assumes a 'departments' table
                'designation_id'        => 'required|integer|exists:designations,id', // Assumes a 'departments' table
                'joining_date'         => 'required|date',
                'phone_number'         => 'nullable|string|max:20',
                'whatsapp_number'      => 'nullable|string|max:20',
                'company_id'           => 'required|integer', // Assumes a 'branches' table
                'profile_image_base64' => 'nullable|string',  // Con

                'email' => 'nullable|string',
                'password' => 'nullable|string',

                'marital_status' => 'nullable|string',

                'gender' => 'nullable|string',
                'date_of_birth' => 'required|string',
                'nationality' => 'nullable|string',
                'religion' => 'nullable|string',
                'blood_group' => 'nullable|string',

                'employee_type' => 'nullable|string',
                'rfid_card_number' => 'nullable|string',

            ]);

            if (! empty($validatedData['joining_date'])) {
                $validatedData["joining_date"] = date("Y-m-d", strtotime($validatedData["joining_date"]));
            }
            if (! empty($validatedData['date_of_birth'])) {
                $validatedData["date_of_birth"] = date("Y-m-d", strtotime($validatedData["date_of_birth"]));
            }

            if (! empty($validatedData['password'])) {
                $validatedData["password"] = Hash::make($validatedData["password"]);
            }

            $dataToUpdate = $validatedData;
            $imagePath    = null;

            // 3. Handle Base64 Image if provided
            if (! empty($validatedData['profile_image_base64'])) {
                $base64Image = $validatedData['profile_image_base64'];

                // Separate MIME and data
                if (Str::startsWith($base64Image, 'data:')) {
                    list($type, $base64Image) = explode(';', $base64Image);
                    list(, $base64Image)      = explode(',', $base64Image);
                }

                $imageData = base64_decode($base64Image);

                $ext = '.png';
                if (isset($type) && str_contains($type, 'jpeg')) {
                    $ext = '.jpg';
                }

                $fileName  = time() . '_' . Str::random(10) . $ext;
                $targetDir = public_path('media/employee/profile_picture/');

                if (! is_dir($targetDir)) {
                    mkdir($targetDir, 0777, true);
                }

                $imagePath = $targetDir . $fileName;
                file_put_contents($imagePath, $imageData);

                // Delete old image if exists
                if ($employee->profile_picture && file_exists($targetDir . $employee->profile_picture)) {
                    unlink($targetDir . $employee->profile_picture);
                }

                $dataToUpdate['profile_picture'] = $fileName;
            }

            unset($dataToUpdate['profile_image_base64']);

            // 4. Update the record
            $employee->update($dataToUpdate);

            // 5. Return success response
            return response()->json([
                'message'  => 'Employee updated successfully!',
                'employee' => $employee,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updateContactDetails(UpdateEmployeeContactsRequest $request, $id)
    {
        $employee = Employee::findOrFail($id);

        $data = $request->only([
            'contact',
            'present_address',
            'permanent_address',
            'primary_contact',
            'secondary_contact',
        ]);

        // Remove null values so existing JSON is not overwritten
        $data = array_filter($data, fn($value) => !is_null($value));

        $employee->update($data);

        return response()->json([
            'status' => true,
            'message' => 'Employee contact details updated successfully',
            'data' => $employee
        ]);
    }

    public function updateAddress(Request $request, $id)
    {
        try {
            // 1. Find employee
            $employee = Employee::findOrFail($id);

            // 2. Validate incoming data
            $validatedData = $request->validate([
                'home_address' => 'nullable|string|max:10',
                'home_tel'     => 'nullable|string|max:50',
                'home_mobile'  => 'nullable|string|max:255',
                'home_fax'     => 'nullable|string|max:100',
                'home_city'    => 'nullable|string|max:100',
                'home_state'   => 'nullable|string|max:100',
                'home_country' => 'nullable|string|max:100',
            ]);

            // 4. Update the record
            $employee->update($validatedData);

            // 5. Return success response
            return response()->json([
                'message'  => 'Employee updated successfully!',
                'employee' => $employee,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updateVisa(Request $request)
    {
        try {

            // 2. Validate incoming data
            $validatedData = $request->validate([
                "visa_no"            => "required|min:2|max:20",
                "place_of_issues"    => "required|min:1|max:20",
                "country"            => "required|min:1|max:20",
                "issue_date"         => "required|date",
                "expiry_date"        => "required|date",

                "security_amount"    => "nullable",
                "labour_no"          => "required",
                "personal_no"        => "nullable",
                "labour_issue_date"  => "required|date",
                "labour_expiry_date" => "required|date",
                "note"               => "nullable",

                "employee_id"        => "required",
                "company_id"         => "required",
            ]);

            info($validatedData);

            $record = Visa::updateOrCreate(['employee_id' => $request->employee_id, 'company_id' => $request->company_id], $validatedData);

            // 5. Return success response
            return response()->json([
                'message'  => 'Visa Info saved successfully!',
                'employee' => $record,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updateEmirate(Request $request)
    {
        try {
            // 2. Validate incoming data
            $validatedData = $request->validate([
                "emirate_id"    => "required|min:8|max:20",
                "name"          => "nullable|min:3|max:20",
                "gender"        => "nullable|min:1|max:20",
                "date_of_birth" => "required",
                "nationality"   => "required",
                "issue"         => "required",
                "expiry"        => "required",

                "employee_id"   => "required",
                "company_id"    => "required",
            ]);

            $record = EmiratesInfo::updateOrCreate(['employee_id' => $request->employee_id, 'company_id' => $request->company_id], $validatedData);

            // 5. Return success response
            return response()->json([
                'message'  => 'Emirate Info saved successfully!',
                'employee' => $record,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updatePassport(Request $request)
    {
        try {
            // 2. Validate incoming data
            $validatedData = $request->validate([
                "passport_no"     => "required|min:8|max:20",
                "place_of_issues" => "nullable|min:3|max:20",
                "issue_date"      => "required",
                "expiry_date"     => "required",

                "employee_id"     => "required",
                "company_id"      => "required",
            ]);

            $record = Passport::updateOrCreate(['employee_id' => $request->employee_id, 'company_id' => $request->company_id], $validatedData);

            // 5. Return success response
            return response()->json([
                'message'  => 'Passport Info saved successfully!',
                'employee' => $record,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updateQualification(Request $request)
    {
        try {
            // 2. Validate incoming data
            $validatedData = $request->validate([

                "certificate" => "nullable|min:3|max:20",
                "type"        => "nullable|min:1|max:20",
                "collage"     => "nullable|min:3|max:20",
                "start"       => "nullable",
                "end"         => "nullable",

                "employee_id" => "required",
                "company_id"  => "required",
            ]);

            $record = Qualification::updateOrCreate(['employee_id' => $request->employee_id, 'company_id' => $request->company_id], $validatedData);

            // 5. Return success response
            return response()->json([
                'message'  => 'Qualification Info saved successfully!',
                'employee' => $record,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updateBank(Request $request)
    {
        try {
            // 2. Validate incoming data
            $validatedData = $request->validate([

                "account_title" => "nullable|min:3|max:20",
                "bank_name"     => "nullable|min:3|max:20",
                "account_no"    => "nullable|min:6|max:20",
                "iban"          => "nullable|min:16|max:24",
                "address"       => "nullable|min:1|max:24",

                "employee_id"   => "required",
                "company_id"    => "required",
            ]);

            $record = BankInfo::updateOrCreate(['employee_id' => $request->employee_id, 'company_id' => $request->company_id], $validatedData);

            // 5. Return success response
            return response()->json([
                'message'  => 'Bank Info saved successfully!',
                'employee' => $record,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updateAccessSettings(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'rfid_card_number'     => 'nullable|string|max:10',
                'rfid_card_password'   => 'nullable|string|max:50',
                'is_active'            => 'sometimes|boolean',
                'inactive_reason_type' => 'nullable|in:suspended,terminated,resigned,long_leave,training,transfer_out,other',
                'inactive_reason_note' => 'nullable|string|max:1000',
                'inactive_from'        => 'nullable|date',
                'inactive_to'          => 'nullable|date|after_or_equal:inactive_from',
            ]);

            $hasStatusUpdate = $request->has('is_active');

            if ($hasStatusUpdate && $validated['is_active'] === false) {
                $request->validate([
                    'inactive_reason_type' => 'required|in:suspended,terminated,resigned,long_leave,training,transfer_out,other',
                    'inactive_from'        => 'required|date',
                ]);

                if (($validated['inactive_reason_type'] ?? null) === 'other') {
                    $request->validate([
                        'inactive_reason_note' => 'required|string|max:1000',
                    ]);
                }
            }

            $employee = Employee::findOrFail($id);
            $wasActive = (bool) $employee->is_active;

            if (array_key_exists('rfid_card_number', $validated)) {
                $employee->rfid_card_number = $validated['rfid_card_number'];
            }
            if (array_key_exists('rfid_card_password', $validated)) {
                $employee->rfid_card_password = $validated['rfid_card_password'];
            }

            if ($hasStatusUpdate) {
                $employee->is_active = $validated['is_active'];

                if ($validated['is_active']) {
                    $employee->inactive_reason_type = null;
                    $employee->inactive_reason_note = null;
                    $employee->inactive_from        = null;
                    $employee->inactive_to          = null;
                } else {
                    $employee->inactive_reason_type = $validated['inactive_reason_type'] ?? null;
                    $employee->inactive_reason_note = $validated['inactive_reason_note'] ?? null;
                    $employee->inactive_from        = $validated['inactive_from']        ?? null;
                    $employee->inactive_to          = $validated['inactive_to']          ?? null;
                }
            }

            $employee->save();

            if ($hasStatusUpdate && $wasActive !== (bool) $employee->is_active) {
                \App\Jobs\PushEmployeeActiveStatusToDevices::dispatch($employee->id, (bool) $employee->is_active);
            }

            return response()->json([
                'message'  => 'Employee updated successfully!',
                'employee' => $employee->fresh(),
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updateLogin(Request $request, $id)
    {
        try {
            $request->validate([
                'email' => 'required|email|unique:users,email,' . $id . ',employee_id',
                'password' => 'nullable|min:8',
            ]);

            // 2. Look up the employee — we need company_id/branch_id to scope the user correctly,
            // otherwise the staff login will get company_id=0 and every API filter returns nothing.
            $employee = Employee::find($id);

            // 1. Check if the user exists — prefer users.employee_id, fall back to the
            // employee.user_id back-link so we don't create a duplicate user row when the
            // original was created via employeeStore (which historically left users.employee_id = 0).
            $user = User::where('employee_id', $id)->first();
            if (! $user && $employee && $employee->user_id) {
                $user = User::find($employee->user_id);
            }

            // 3. Prepare the base data
            $data = [
                'name'  => "---",
                'email' => $request->email,
            ];

            // 4. Handle Password
            if ($request->filled('password') && $request->password !== "********") {
                $data['password'] = Hash::make($request->password);
            } elseif (!$user) {
                // CRITICAL: new user without password — column is NOT NULL.
                $data['password'] = "secret";
            }

            // 5. Always (re)scope the user to the employee's company/branch when employee exists.
            // Fixes: staff users having company_id=0 → empty dashboards, missing birthday popup, etc.
            if ($employee) {
                $data['company_id'] = $employee->company_id;
                $data['branch_id']  = $employee->branch_id;
            }

            // Ensure user_type is set so routing + permissions recognize this as a staff login.
            if (empty($data['user_type'])) {
                $data['user_type'] = 'employee';
            }

            // Always (re)bind the user row to this employee so /me and API filters resolve correctly.
            $data['employee_id'] = $id;

            // 6. Perform the Update or Create
            if ($user) {
                $user->update($data);
            } else {
                $user = User::create($data);
            }

            // 7. Backfill the employee->user link if missing.
            // Without this, Employee::user() (belongsTo via user_id) returns an empty default
            // and the Edit page shows blank email + disabled toggles even though the user row exists.
            if ($employee && (int) $employee->user_id !== (int) $user->id) {
                $employee->user_id = $user->id;
                $employee->save();
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Credentials saved successfully!',
                'user'    => $user,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to save user.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function updateGeneralSettings(Request $request, $id = null)
    {
        try {

            if ($request->status) {
                Employee::where('id', $request->id)->update(['status' => $request->status]);
            }

            // Try multiple ways to find the user
            $user = null;
            if ($id && $id !== 'undefined') {
                $user = User::find($id);
            }
            if (!$user && $request->id) {
                $user = User::where('employee_id', $request->id)->first();
            }

            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot update login settings because no user account exists for this employee.'
                ], 404);
            }

            $user->update($request->only([
                'web_login_access',
                'mobile_app_login_access',
                'tracking_status',
                'mobile_punch',
            ]));

            return response()->json([
                'status' => 'success',
                'message' => 'General settings have been updated successfully.'
            ], 200);
        } catch (ModelNotFoundException $e) {
            // This catches the fail from Employee::findOrFail($id)
            return response()->json([
                'status' => 'error',
                'message' => "Sorry, we couldn't find login info."
            ], 404);
        } catch (\Exception $e) {
            // This catches any other unexpected errors (Database down, syntax errors, etc.)
            Log::error("General Settings Update Error: " . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'An unexpected error occurred. Please try again later.'
            ], 500);
        }
    }

    public function updatePassword(Request $request, $id)
    {
        try {
            User::where('id', $id)->update(['password' =>  Hash::make($request->password)]);
            return response()->json(['message' => 'Updated successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function leaveGroupAndReportManagerUpdate(Request $request, $id)
    {
        try {
            // 2. Validate incoming data
            $validatedData = $request->validate([
                'leave_group_id'       => 'nullable',
                'reporting_manager_id' => 'nullable',
            ]);

            $employee = Employee::where('id', $id)->update($validatedData);

            // 5. Return success response
            return response()->json([
                'message'  => 'Employee updated successfully!',
                'employee' => $employee,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function updateDocument(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'title' => 'required|string',
            'issue_date' => 'required|string',
            'expiry_date' => 'nullable|string',
        ]);

        $payload = [

            "type" => $request->type,
            "title" => $request->title,

            "issue_date" => $request->issue_date,
            "expiry_date" => $request->expiry_date,

            "attachment" => (new DocumentInfoController)->saveFile($request->attachment, $request->employee_id),

            "employee_id" => $request->employee_id,
            "company_id" => $request->company_id,
        ];


        try {
            $result = DocumentInfo::create($payload);
            // 5. Return success response
            return response()->json([
                'message'  => 'Document saved updated successfully!',
                'employee' => $result,
            ], 200);
        } catch (ValidationException $e) {
            $indexedErrors = collect($e->errors())->flatten()->all();

            return response()->json([
                'message' => $indexedErrors[0],
                'errors'  => $indexedErrors,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Employee not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'An error occurred while updating the employee.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        $employee = Employee::findOrFail($id);

        // Use load() for instances already retrieved from the database
        $employee->load([
            "finger_prints",
            "palms",
            "reportTo",
            "branch",
            "department.branch", // Shorthand for nested relations
            "sub_department",
            "designation",
            "payroll",
            "passport",
            "emirate",
            "qualification",
            "bank",
            "leave_group",
            "Visa",
            "reporting_manager",
            "schedule"
        ]);

        return $employee;
    }


    public function employeesJson($id)
    {
        // $filePath = storage_path('app') . '/employees_list.json';

        // // Check if file exists and return cached data
        // if (file_exists($filePath)) {
        //     $jsonContent = file_get_contents($filePath);
        //     return json_decode($jsonContent, true);
        // }

        // Fallback: Generate if file doesn't exist
        $employees = Employee::where("company_id", $id)
            ->get([
                "id",
                "company_id",
                "employee_id",
                "system_user_id",
                "branch_id",
                "department_id",
                "first_name as name",
                "profile_picture",
            ])
            ->keyBy("employee_id");

        return $employees;
    }

    public function getEmployeesJson()
    {
        try {
            $filePath = storage_path('app') . '/employees_list.json';

            if (!file_exists($filePath)) {
                return response()->json([
                    'status' => false,
                    'message' => 'Employees JSON cache not found. Run: php artisan employees:generate-json',
                    'data' => null
                ], 404);
            }

            // Serve raw JSON file directly without re-parsing for maximum speed
            return response()->file($filePath, [
                'Content-Type' => 'application/json',
                'Cache-Control' => 'public, max-age=3600'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Error retrieving employees data',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function employeeAiRelatedInfo(Request $request, $id)
    {
        $today = date('Y-m-d');

        $schedule = ScheduleEmployee::query()
            ->where('company_id', $request->company_id)
            ->where('employee_id', $id)
            ->where('from_date', '<=', $today)
            ->where('to_date', '>=', $today)
            ->with(['shift:id,name,on_duty_time,off_duty_time', 'shift_type:id,name'])
            ->orderBy('updated_at', 'desc')
            ->first();


        if (!$schedule) {
            return response()->json([
                'status' => false,
                'message' => 'No active shift found for employee.',
                'shift' => null,
                'schedule' => null,
            ]);
        }

        $shift = $schedule->shift; // access it first
        $shift_type = $schedule->shift_type; // access it first

        $schedule->makeHidden(['shift', 'shift_type']);

        $logCount = AttendanceLog::where('UserID', $id)
            ->where('company_id', $request->company_id)
            ->where('LogTime', '>=', $today . ' 00:00:00')
            ->where('LogTime', '<=', $today . ' 23:59:59')
            ->with('device')
            ->distinct('LogTime')
            ->orderBy('LogTime')
            ->count();

        // $attendanceLogs->makeHidden(['device']);

        // $logCount = $attendanceLogs->count();

        return response()->json([
            'status' => true,
            'shift' => $shift,
            'shift_type' => $shift_type,
            'schedule' => $schedule,
            'attendance_logs' => [
                'count' => $logCount,
                'clock_status' => $logCount === 0 ? false : ($logCount % 2 === 0 ? 'OUT' : 'IN'),
                // 'data' => $attendanceLogs,
            ],
        ]);
    }
}
