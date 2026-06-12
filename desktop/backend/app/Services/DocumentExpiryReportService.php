<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DocumentExpiryReportService
{
    /**
     * Documents expiring within $daysThreshold days from $date.
     *
     * Schema varies between installations; this tries the most common
     * employee-documents tables and gracefully returns an empty result
     * if none are found.
     */
    public function buildRows(int $companyId, int $branchId, string $date, int $daysThreshold = 30): array
    {
        $table = $this->findDocsTable();
        if (!$table || !Schema::hasTable('employees')) {
            return [];
        }

        $expiryCol = Schema::hasColumn($table, 'expiry_date') ? 'expiry_date'
            : (Schema::hasColumn($table, 'expire_date') ? 'expire_date'
            : (Schema::hasColumn($table, 'expiration_date') ? 'expiration_date' : null));
        if (!$expiryCol) {
            return [];
        }

        $cutoff = date('Y-m-d', strtotime("{$date} +{$daysThreshold} days"));

        // Use a portable DATEDIFF expression for Postgres vs MySQL.
        $driver = DB::connection()->getDriverName();
        $daysLeftSql = $driver === 'pgsql'
            ? "(ed.{$expiryCol}::date - '{$date}'::date) as days_left"
            : "DATEDIFF(ed.{$expiryCol}, '{$date}') as days_left";

        return DB::table("{$table} as ed")
            ->join('employees as e', 'e.id', '=', 'ed.employee_id')
            ->where('e.company_id', $companyId)
            ->when($branchId && Schema::hasColumn('employees', 'branch_id'), fn($q) => $q->where('e.branch_id', $branchId))
            ->whereNotNull("ed.{$expiryCol}")
            ->whereBetween("ed.{$expiryCol}", [$date, $cutoff])
            ->orderBy("ed.{$expiryCol}")
            ->select(
                DB::raw("TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')) as employee_name"),
                'ed.document_type',
                Schema::hasColumn($table, 'document_number') ? 'ed.document_number' : DB::raw("'' as document_number"),
                Schema::hasColumn($table, 'issue_date') ? 'ed.issue_date' : DB::raw('NULL as issue_date'),
                "ed.{$expiryCol} as expiry_date",
                DB::raw($daysLeftSql),
            )
            ->limit(5000)
            ->get()
            ->map(fn($r) => (array) $r)
            ->all();
    }

    private function findDocsTable(): ?string
    {
        foreach (['employee_documents', 'employee_document', 'documents'] as $candidate) {
            if (Schema::hasTable($candidate)) {
                return $candidate;
            }
        }
        return null;
    }
}
