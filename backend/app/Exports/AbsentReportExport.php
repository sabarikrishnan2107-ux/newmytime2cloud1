<?php

namespace App\Exports;

use App\Services\AbsentReportService;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AbsentReportExport implements FromArray, WithHeadings
{
    public function __construct(
        private int $companyId,
        private int $branchId,
        private string $date,
    ) {}

    public function array(): array
    {
        $request = new Request([
            'mode' => 'daily',
            'company_id' => $this->companyId,
            'branch_ids' => $this->branchId ? [$this->branchId] : [],
            'from_date' => $this->date,
            'to_date' => $this->date,
        ]);

        $payload = app(AbsentReportService::class)->buildDailyPayload($request);

        return array_map(fn($row) => [
            $row['emp_id'] ?? '',
            $row['name'] ?? '',
            $row['dept'] ?? '',
            $row['branch'] ?? '',
            $row['shift_name'] ?? '',
            $row['shift_time'] ?? '',
            $row['absent_type'] ?? '',
            $row['streak'] ?? 0,
            $row['last_present'] ?? '',
            $row['approved'] ? 'Yes' : 'No',
        ], $payload['rows'] ?? []);
    }

    public function headings(): array
    {
        return ['Emp ID', 'Name', 'Department', 'Branch', 'Shift', 'Shift Time', 'Absent Type', 'Streak (days)', 'Last Present', 'Approved'];
    }
}
