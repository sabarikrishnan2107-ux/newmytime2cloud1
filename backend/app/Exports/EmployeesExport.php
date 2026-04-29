<?php

namespace App\Exports;

use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EmployeesExport implements FromQuery, WithMapping, WithHeadings, WithStyles, WithTitle, ShouldAutoSize, WithEvents
{
    protected Builder $query;

    public function __construct(Builder $query)
    {
        $this->query = $query;
    }

    public function title(): string
    {
        return 'Employees';
    }

    public function query()
    {
        return $this->query;
    }

    public function headings(): array
    {
        return [
            'title',
            'employee_id',
            'employee_device_id',
            'first_name',
            'last_name',
            'display_name',
            'email',
            'phone_number',
            'whatsapp_number',
            'joining_date',
            'department',
            'designation',
            'branch',
        ];
    }

    public function map($e): array
    {
        return [
            $e->title ?? '',
            $e->employee_id ?? '',
            $e->system_user_id ?? '',
            $e->first_name ?? '',
            $e->last_name ?? '',
            $e->display_name ?? '',
            optional($e->user)->email ?? '',
            $e->phone_number ?? '',
            $e->whatsapp_number ?? '',
            $e->joining_date ? date('Y-m-d', strtotime($e->joining_date)) : '',
            optional($e->department)->name ?? '',
            optional($e->designation)->name ?? '',
            optional($e->branch)->branch_name ?? '',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 11],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E5F8E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->getRowDimension(1)->setRowHeight(28);
                $highest = $sheet->getHighestColumn() . $sheet->getHighestRow();
                $sheet->getStyle('A1:' . $highest)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['argb' => 'FFE5E7EB'],
                        ],
                    ],
                ]);
                $sheet->freezePane('A2');
            },
        ];
    }
}
