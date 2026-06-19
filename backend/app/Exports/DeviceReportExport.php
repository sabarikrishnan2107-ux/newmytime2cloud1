<?php

namespace App\Exports;

use App\Services\DeviceReportService;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class DeviceReportExport implements FromArray, WithHeadings
{
    public function __construct(
        private int $companyId,
        private int $branchId,
        private string $date,
    ) {}

    public function array(): array
    {
        $rows = app(DeviceReportService::class)
            ->buildRows($this->companyId, $this->branchId, $this->date);

        return array_map(fn($r) => [
            $r['device_id'] ?? '',
            $r['device_name'] ?? '',
            $r['branch_id'] ?? '',
            $r['last_seen'] ?? '',
            $r['events_today'] ?? 0,
        ], $rows);
    }

    public function headings(): array
    {
        return ['Device ID', 'Device Name', 'Branch', 'Last Seen', 'Events Today'];
    }
}
