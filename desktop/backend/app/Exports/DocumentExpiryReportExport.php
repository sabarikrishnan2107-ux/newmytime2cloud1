<?php

namespace App\Exports;

use App\Services\DocumentExpiryReportService;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class DocumentExpiryReportExport implements FromArray, WithHeadings
{
    public function __construct(
        private int $companyId,
        private int $branchId,
        private string $date,
        private int $daysThreshold = 30,
    ) {}

    public function array(): array
    {
        $rows = app(DocumentExpiryReportService::class)
            ->buildRows($this->companyId, $this->branchId, $this->date, $this->daysThreshold);

        return array_map(fn($r) => [
            $r['employee_name'] ?? '',
            $r['document_type'] ?? '',
            $r['document_number'] ?? '',
            $r['issue_date'] ?? '',
            $r['expiry_date'] ?? '',
            $r['days_left'] ?? '',
        ], $rows);
    }

    public function headings(): array
    {
        return ['Employee', 'Document Type', 'Document #', 'Issue Date', 'Expiry Date', 'Days Left'];
    }
}
