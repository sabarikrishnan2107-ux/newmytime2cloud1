<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AccessControlReportService
{
    /**
     * Pulls one day's access-control log rows for a company/branch, optionally
     * scoped to a time window.
     *
     * The Postgres schema for access-control logs uses different table names
     * in different installations (some have `access_control_logs`, others
     * inherit from the device-logs table). We try the most likely names in
     * order and fall back to an empty array — the caller logs the issue.
     */
    public function buildRows(int $companyId, int $branchId, string $date, ?string $fromTime = null, ?string $toTime = null): array
    {
        $table = $this->findTable();
        if (!$table) {
            return [];
        }

        $timeColumn = Schema::hasColumn($table, 'log_time') ? 'log_time'
            : (Schema::hasColumn($table, 'created_at') ? 'created_at' : null);
        if (!$timeColumn) {
            return [];
        }

        $q = DB::table("{$table} as l")
            ->where('l.company_id', $companyId)
            ->whereDate("l.{$timeColumn}", $date);

        if ($branchId && Schema::hasColumn($table, 'branch_id')) {
            $q->where('l.branch_id', $branchId);
        }
        if ($fromTime) {
            $q->whereTime("l.{$timeColumn}", '>=', $fromTime);
        }
        if ($toTime) {
            $q->whereTime("l.{$timeColumn}", '<=', $toTime);
        }

        return $q->orderBy("l.{$timeColumn}")
            ->limit(10000)
            ->get()
            ->map(fn($r) => (array) $r)
            ->all();
    }

    private function findTable(): ?string
    {
        foreach (['access_control_logs', 'access_logs', 'device_logs'] as $candidate) {
            if (Schema::hasTable($candidate)) {
                return $candidate;
            }
        }
        return null;
    }
}
