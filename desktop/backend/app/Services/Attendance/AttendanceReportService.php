<?php

namespace App\Services\Attendance;

use App\Models\Attendance;

class AttendanceReportService
{
    private const SHIFT_TYPE_LABELS = [
        1 => 'FILO',
        2 => 'Multi In/Out',
        3 => 'Auto Shift',
        4 => 'Night Shift',
        5 => 'Split Duty',
        6 => 'Single Shift',
    ];

    public function __construct(
        private AttendanceSessionNormalizer $normalizer
    ) {}

    /**
     * Query attendances for the given employees and build normalized day records.
     *
     * Returns:
     * [
     *   employee_id => [
     *     'employee' => Employee model,
     *     'records'  => [ ...day record arrays... ],
     *   ],
     *   ...
     * ]
     */
    public function buildEmployeeRecords(
        array $employeeIds,
        string $from,
        string $to
    ): array {
        $attendances = Attendance::select([
            'id',
            'employee_id',
            'company_id',
            'date',
            'shift_id',
            'shift_type_id',
            'in_time',
            'out_time',
            'device_id_in',
            'device_id_out',
            'logs',
            'total_hrs',
            'late_coming',
            'early_going',
            'ot',
            'status',
            'is_manual_entry',
            'branch_id',
        ])
        ->with([
            'employee:system_user_id,first_name,last_name,employee_id,department_id,branch_id',
            'employee.department:id,name',
            'employee.branch:id,name',
            'shift:id,name,shift_type_id,on_duty_time,off_duty_time',
            'device_in:device_id,name',
            'device_out:device_id,name',
        ])
        ->whereIn('employee_id', $employeeIds)
        ->whereBetween('date', [$from, $to])
        ->orderBy('date')
        ->get();

        $result = [];

        foreach ($attendances as $attendance) {
            $empId = $attendance->employee_id;

            if (! isset($result[$empId])) {
                $result[$empId] = [
                    'employee' => $attendance->employee,
                    'records'  => [],
                ];
            }

            $result[$empId]['records'][] = $this->buildDayRecord($attendance);
        }

        return $result;
    }

    /**
     * Aggregate status counts and totals from a set of day records.
     */
    public function buildSummary(array $dayRecords): array
    {
        $statuses = array_column($dayRecords, 'status');

        return [
            'total_present' => count(array_filter($statuses, fn($s) => in_array($s, ['P', 'LC', 'EG']))),
            'total_absent'  => count(array_filter($statuses, fn($s) => $s === 'A')),
            'total_off'     => count(array_filter($statuses, fn($s) => $s === 'O')),
            'total_missing' => count(array_filter($statuses, fn($s) => $s === 'M')),
            'total_leave'   => count(array_filter($statuses, fn($s) => $s === 'L')),
            'total_holiday' => count(array_filter($statuses, fn($s) => $s === 'H')),
            'total_hours'   => getTotalHours(array_column($dayRecords, 'total_hrs')),
            'total_late'    => getTotalHours(array_column($dayRecords, 'late_coming')),
            'total_early'   => getTotalHours(array_column($dayRecords, 'early_going')),
            'total_ot'      => getTotalHours(array_column($dayRecords, 'ot')),
        ];
    }

    /**
     * Query all attendances for a company on a specific date and build
     * normalized row records for the daily report.
     *
     * Returns flat array:
     * [
     *   [
     *     'employee'   => Employee model,
     *     'record'     => day record array,
     *   ],
     *   ...
     * ]
     */
    public function buildDailyReport(
        int    $companyId,
        string $date,
        ?int   $departmentId = null,
        ?string $status      = null
    ): array {
        $query = Attendance::select([
            'id',
            'employee_id',
            'company_id',
            'date',
            'shift_id',
            'shift_type_id',
            'in_time',
            'out_time',
            'device_id_in',
            'device_id_out',
            'logs',
            'total_hrs',
            'late_coming',
            'early_going',
            'ot',
            'status',
            'is_manual_entry',
            'branch_id',
        ])
        ->with([
            'employee:system_user_id,first_name,last_name,employee_id,department_id,branch_id,company_id',
            'employee.department:id,name',
            'employee.branch:id,name',
            'shift:id,name,shift_type_id,on_duty_time,off_duty_time',
            'device_in:device_id,name',
            'device_out:device_id,name',
        ])
        ->where('company_id', $companyId)
        ->whereDate('date', $date)
        ->orderBy('employee_id');

        if ($departmentId && $departmentId !== -1) {
            $query->whereHas('employee', fn($q) => $q->where('department_id', $departmentId));
        }

        if ($status && $status !== '-1') {
            if ($status === 'LC') {
                $query->where('late_coming', '!=', '---');
            } elseif ($status === 'EG') {
                $query->where('early_going', '!=', '---');
            } else {
                $query->where('status', $status);
            }
        }

        $rows = [];

        foreach ($query->get() as $attendance) {
            $rows[] = [
                'employee' => $attendance->employee,
                'record'   => $this->buildDayRecord($attendance),
            ];
        }

        return $rows;
    }

    private function buildDayRecord(Attendance $attendance): array
    {
        $rawDate     = $attendance->getRawOriginal('date');
        $shiftTypeId = (int) $attendance->getRawOriginal('shift_type_id');

        return [
            'date'        => date('d M Y', strtotime($rawDate)),
            'day'         => date('l', strtotime($rawDate)),
            'shift_name'  => optional($attendance->shift)->name ?? '---',
            'shift_type'  => self::SHIFT_TYPE_LABELS[$shiftTypeId] ?? 'General',
            'sessions'    => $this->normalizer->normalize($attendance),
            'total_hrs'   => $attendance->total_hrs   ?? '---',
            'late_coming' => $attendance->late_coming ?? '---',
            'early_going' => $attendance->early_going ?? '---',
            'ot'          => $attendance->ot          ?? '---',
            'status'      => $attendance->status      ?? 'A',
        ];
    }
}
