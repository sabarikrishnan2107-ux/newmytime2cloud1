<?php

namespace App\Imports;

use App\Http\Controllers\AttendanceController;
use App\Models\CompanyBranch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\Importable;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class EmployeesImport implements ToCollection, WithHeadingRow
{
    use Importable;

    protected int $companyId;
    protected int $branchId;

    public array $created = [];
    public array $skipped = [];
    public array $errors = [];

    public function __construct(int $companyId, int $branchId = 0)
    {
        $this->companyId = $companyId;
        $this->branchId = $branchId;
    }

    public function collection(Collection $rows)
    {
        if ($rows->isEmpty()) {
            $this->errors[] = 'The uploaded file has no data rows.';
            return;
        }

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $data = $this->normalize($row->toArray());

            if ($this->isEmptyRow($data)) {
                continue;
            }

            $validation = $this->validate($data);
            if ($validation !== true) {
                $this->errors[] = "Row {$rowNumber}: " . $validation;
                continue;
            }

            if (Employee::where('company_id', $this->companyId)
                ->where(function ($q) use ($data) {
                    $q->where('system_user_id', $data['employee_device_id'])
                        ->orWhere('employee_id', $data['employee_id']);
                })->exists()) {
                $this->skipped[] = "Row {$rowNumber}: employee_id '{$data['employee_id']}' or device_id '{$data['employee_device_id']}' already exists";
                continue;
            }

            $departmentId = $this->resolveDepartmentId($data['department']);
            if (! $departmentId) {
                $this->errors[] = "Row {$rowNumber}: department '{$data['department']}' not found for this company";
                continue;
            }

            $branchId = $this->resolveBranchId($data['branch'] ?? '') ?: $this->branchId;
            $designationId = $this->resolveDesignationId($data['designation'] ?? '');

            $payload = [
                'title'          => $data['title'],
                'employee_id'    => $data['employee_id'],
                'system_user_id' => $data['employee_device_id'],
                'first_name'     => $data['first_name'],
                'last_name'      => $data['last_name'],
                'display_name'   => $data['display_name'],
                'phone_number'   => $data['phone_number'] ?? null,
                'whatsapp_number'=> $data['whatsapp_number'] ?? null,
                'local_email'    => $data['email'] ?? null,
                'joining_date'   => $this->parseDate($data['joining_date'] ?? null),
                'company_id'     => $this->companyId,
                'department_id'  => $departmentId,
                'branch_id'      => $branchId,
            ];

            if ($designationId) {
                $payload['designation_id'] = $designationId;
            }

            $profilePictureFile = $this->resolveProfilePicture($data['profile_picture'] ?? null, $data['employee_id']);
            if ($profilePictureFile) {
                $payload['profile_picture'] = $profilePictureFile;
            }

            try {
                Employee::create($payload);
                $this->created[] = $data['employee_id'];

                try {
                    (new AttendanceController)->seedDefaultData($this->companyId, [$data['employee_device_id']], $branchId);
                } catch (\Throwable $e) {
                    // attendance seeding failure should not block employee creation
                }
            } catch (\Throwable $e) {
                $this->errors[] = "Row {$rowNumber}: " . $e->getMessage();
            }
        }
    }

    protected function normalize(array $row): array
    {
        $out = [];
        foreach ($row as $k => $v) {
            $key = strtolower(trim((string) $k));
            $val = is_string($v) ? trim($v) : $v;
            $out[$key] = $val === '' ? null : $val;
        }
        return $out + [
            'title' => null, 'employee_id' => null, 'employee_device_id' => null,
            'first_name' => null, 'last_name' => null, 'display_name' => null,
            'email' => null, 'phone_number' => null, 'whatsapp_number' => null,
            'joining_date' => null, 'department' => null, 'designation' => null,
            'branch' => null, 'profile_picture' => null,
        ];
    }

    protected function resolveProfilePicture($value, $employeeId): ?string
    {
        if (empty($value)) return null;
        $value = trim((string) $value);

        $destDir = public_path('media/employee/profile_picture');
        if (! is_dir($destDir)) {
            @mkdir($destDir, 0775, true);
        }

        if (preg_match('#^https?://#i', $value)) {
            try {
                $contents = @file_get_contents($value);
                if ($contents === false || $contents === '') return null;
                $ext = strtolower(pathinfo(parse_url($value, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION));
                if (! in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
                    $ext = 'jpg';
                }
                $filename = $this->safeProfileFilename($employeeId, $ext);
                if (file_put_contents($destDir . DIRECTORY_SEPARATOR . $filename, $contents) === false) {
                    return null;
                }
                return $filename;
            } catch (\Throwable $e) {
                return null;
            }
        }

        $filename = basename($value);
        if (file_exists($destDir . DIRECTORY_SEPARATOR . $filename)) {
            return $filename;
        }
        return null;
    }

    protected function safeProfileFilename($employeeId, string $ext): string
    {
        $base = preg_replace('/[^A-Za-z0-9_\-]/', '_', (string) $employeeId);
        if ($base === '') $base = 'employee';
        return $base . '_' . substr(bin2hex(random_bytes(4)), 0, 8) . '.' . $ext;
    }

    protected function isEmptyRow(array $data): bool
    {
        foreach (['employee_id', 'employee_device_id', 'first_name', 'last_name'] as $k) {
            if (! empty($data[$k])) return false;
        }
        return true;
    }

    protected function validate(array $data)
    {
        $rules = [
            'title'              => ['required', 'in:Mr,Mrs,Miss,Ms,Dr'],
            'employee_id'        => ['required'],
            'employee_device_id' => ['required'],
            'first_name'         => ['required'],
            'last_name'          => ['required'],
            'display_name'       => ['required', 'min:3', 'max:10'],
            'department'         => ['required'],
            'email'              => ['nullable', 'email'],
        ];
        $messages = [
            'title.in'              => 'title must be one of Mr, Mrs, Miss, Ms, Dr',
            'display_name.min'      => 'display_name must be at least 3 characters',
            'display_name.max'      => 'display_name cannot exceed 10 characters',
            'email.email'           => 'email is not valid',
        ];
        $v = Validator::make($data, $rules, $messages);
        if ($v->fails()) {
            return implode('; ', $v->errors()->all());
        }
        return true;
    }

    protected function resolveDepartmentId($value): ?int
    {
        if (empty($value)) return null;
        $q = Department::where('company_id', $this->companyId);
        if (is_numeric($value)) {
            $hit = (clone $q)->where('id', (int) $value)->first();
            if ($hit) return (int) $hit->id;
        }
        $hit = $q->whereRaw('LOWER(name) = ?', [strtolower((string) $value)])->first();
        return $hit ? (int) $hit->id : null;
    }

    protected function resolveBranchId($value): ?int
    {
        if (empty($value)) return null;
        $q = CompanyBranch::where('company_id', $this->companyId);
        if (is_numeric($value)) {
            $hit = (clone $q)->where('id', (int) $value)->first();
            if ($hit) return (int) $hit->id;
        }
        $hit = $q->whereRaw('LOWER(branch_name) = ?', [strtolower((string) $value)])->first();
        return $hit ? (int) $hit->id : null;
    }

    protected function resolveDesignationId($value): ?int
    {
        if (empty($value)) return null;
        $q = Designation::where('company_id', $this->companyId);
        if (is_numeric($value)) {
            $hit = (clone $q)->where('id', (int) $value)->first();
            if ($hit) return (int) $hit->id;
        }
        $hit = $q->whereRaw('LOWER(name) = ?', [strtolower((string) $value)])->first();
        return $hit ? (int) $hit->id : null;
    }

    protected function parseDate($value): ?string
    {
        if (empty($value)) return null;
        if (is_numeric($value)) {
            try {
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $value)->format('Y-m-d');
            } catch (\Throwable $e) {}
        }
        try {
            return date('Y-m-d', strtotime((string) $value));
        } catch (\Throwable $e) {
            return null;
        }
    }
}
