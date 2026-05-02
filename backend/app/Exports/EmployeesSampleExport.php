<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EmployeesSampleExport implements FromArray, WithHeadings, WithStyles, WithTitle, ShouldAutoSize, WithEvents, WithColumnFormatting
{
    public function title(): string
    {
        return 'Employees';
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
            'profile_picture',
        ];
    }

    public function array(): array
    {
        return [
            [
                'Mr', 'EMP001', '1001', 'John', 'Doe', 'John',
                'john.doe@example.com', '9876543210', '9876543210',
                '2026-04-01', 'Front Office', 'Receptionist', 'TANJORE',
                'https://example.com/john.jpg',
            ],
            [
                'Mrs', 'EMP002', '1002', 'Jane', 'Smith', 'Jane',
                'jane.smith@example.com', '9876543211', '',
                '2026-04-15', 'Housekeeping', 'HouseKeeping', 'KODAI',
                '',
            ],
        ];
    }

    public function columnFormats(): array
    {
        return [
            'B' => NumberFormat::FORMAT_TEXT,
            'C' => NumberFormat::FORMAT_TEXT,
            'H' => NumberFormat::FORMAT_TEXT,
            'I' => NumberFormat::FORMAT_TEXT,
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

                $instructions = [
                    '',
                    'INSTRUCTIONS:',
                    '1. Required fields: title, employee_id, employee_device_id, first_name, last_name, display_name, department',
                    '2. title must be one of: Mr, Mrs, Miss, Ms, Dr',
                    '3. display_name must be 3-10 characters',
                    '4. employee_id and employee_device_id must be unique per company',
                    '5. department, designation and branch can be matched by name (case-insensitive)',
                    '6. joining_date format: YYYY-MM-DD (e.g. 2026-04-01)',
                    '7. profile_picture is OPTIONAL - paste a public image URL (jpg/png/webp); leave blank to skip. Employees still import without an image.',
                    '8. Delete the example rows before uploading your data',
                ];
                $startRow = $sheet->getHighestRow() + 2;
                foreach ($instructions as $i => $text) {
                    $cell = 'A' . ($startRow + $i);
                    $sheet->setCellValue($cell, $text);
                    if ($i === 1) {
                        $sheet->getStyle($cell)->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF0A3D62'));
                    } else {
                        $sheet->getStyle($cell)->getFont()->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF6B7280'));
                    }
                }
            },
        ];
    }
}
