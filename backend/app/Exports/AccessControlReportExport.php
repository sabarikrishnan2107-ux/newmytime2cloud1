<?php

namespace App\Exports;

use App\Services\AccessControlReportService;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AccessControlReportExport implements FromArray, WithHeadings
{
    public function __construct(
        private int $companyId,
        private int $branchId,
        private string $date,
        private ?string $fromTime = null,
        private ?string $toTime = null,
    ) {}

    public function array(): array
    {
        $rows = app(AccessControlReportService::class)
            ->buildRows($this->companyId, $this->branchId, $this->date, $this->fromTime, $this->toTime);

        return array_map(fn($r) => [
            $r['log_time'] ?? $r['created_at'] ?? '',
            $r['employee_name'] ?? $r['employee_id'] ?? '',
            $r['door_name'] ?? $r['device_id'] ?? '',
            $r['direction'] ?? '',
            $r['result'] ?? $r['status'] ?? '',
        ], $rows);
    }

    public function headings(): array
    {
        return ['Time', 'Employee', 'Device / Door', 'Direction', 'Result'];
    }
}
