<?php

namespace App\Exports;

use App\Models\Attendance;
use Illuminate\Database\Query\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class AttendanceExport implements FromQuery, WithMapping, WithHeadings, ShouldAutoSize
{
    protected $query;
    protected $colLength;

    public function __construct(Builder|\Illuminate\Database\Eloquent\Builder $query, $colLength)
    {
        $this->query = $query;
        $this->colLength = $colLength;
    }

    public function query()
    {
        // Use `select()` to reduce fetched columns if possible
        return $this->query;
    }

    public function headings(): array
    {
        $logArray = [
            "Date",
            "E.ID",
            "Full Name",
            "Department",
            "Position",

        ];

        foreach (range(0, $this->colLength - 1) as $index) {
            $itemNumber = $index + 1;
            $logArray[] = "in$itemNumber" ?? "---";
            $logArray[] = "out$itemNumber" ?? "---";
        }

        return array_merge($logArray, [
            "Total Hrs",
            "OT",
            "Status"
        ]);
    }

    public function map($row): array
    {

        // Append default log values if logs are missing
        $logArray = [];

        $logs = $row->logs ?? [];
        $count = count($logs);

        if ($count < $this->colLength) {
            for ($i = $count; $i < $this->colLength; $i++) {
                $logs[] = null;
            }
        }

        foreach (range(0, $this->colLength - 1) as $index) {
            $logArray[] = $logs[$index]["in"] ?? "---";
            $logArray[] = $logs[$index]["out"] ?? "---";
        }

        return array_merge([
            $row->date,
            (string) ($row->employee->employee_id ?? "---"),
            $row->employee->full_name ?? $row->employee->first_name . ' ' . $row->employee->last_name,
            $row->employee->department->name ?? "---",
            $row->employee->designation->name ?? "---",
        ], $logArray, [
            $row->total_hrs ?? "---",
            $row->ot ?? "---",
            $row->status ?? "---",
        ]);
    }

    public function styles($sheet)
    {
        return [
            // Apply text format to the 'Email' column
            'C' => ['numberFormat' => NumberFormat::FORMAT_TEXT],
        ];
    }
}
