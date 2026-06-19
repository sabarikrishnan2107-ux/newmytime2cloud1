<?php
namespace App\Exports;

use Illuminate\Database\Query\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class AttendanceExportGeneral implements FromQuery, WithMapping, WithHeadings, ShouldAutoSize
{
    protected $query;

    public function __construct(Builder | \Illuminate\Database\Eloquent\Builder $query)
    {
        $this->query = $query;
    }

    public function query()
    {
        // Use `select()` to reduce fetched columns if possible
        return $this->query;
    }

    public function headings(): array
    {
        return [
            "Date", "E.ID", "Name", "Dept", "Desg", "Shift Type", "Shift", "In", "Out", "Late coming", "Early Going", "OT", "Total Hrs", "Status",
        ];
    }

    public function map($row): array
    {
        $employee    = $row->employee;
        $department  = $employee->department ?? null;
        $designation = $employee->designation ?? null;

        return array_merge([
            $row->date,
            (string) ($employee->employee_id ?? '---'),
            $employee->full_name ?? trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? '')),
            $department->name ?? '---',
            $designation->name ?? '---',
            $row->shift_type->name ?? "---",
            $row->shift->name ?? "---",
            $row->in ?? "---",
            $row->out ?? "---",
            $row->late_coming ?? "---",
            $row->early_going ?? "---",
            $row->ot ?? "---",
            $row->total_hrs ?? "---",
            $row->status ?? "---",
        ]);
    }
}
