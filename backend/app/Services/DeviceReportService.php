<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DeviceReportService
{
    /**
     * Roll up device events / heartbeats for one day per branch.
     *
     * Joins the device master table to whatever per-event/log table exists
     * (common names: device_logs, devices_logs). Returns one row per device
     * with count of events and last-seen timestamp.
     */
    public function buildRows(int $companyId, int $branchId, string $date): array
    {
        if (!Schema::hasTable('devices')) {
            return [];
        }

        $logsTable = $this->findLogsTable();
        $timeCol = $logsTable && Schema::hasColumn($logsTable, 'log_time') ? 'log_time'
            : ($logsTable && Schema::hasColumn($logsTable, 'created_at') ? 'created_at' : null);

        $q = DB::table('devices as d')
            ->where('d.company_id', $companyId)
            ->when($branchId && Schema::hasColumn('devices', 'branch_id'), fn($q2) => $q2->where('d.branch_id', $branchId));

        if ($logsTable && $timeCol) {
            $q->leftJoin("{$logsTable} as l", function ($j) use ($timeCol, $date) {
                $j->on('l.device_id', '=', 'd.id')
                    ->whereDate("l.{$timeCol}", $date);
            })
            ->select(
                'd.id as device_id',
                DB::raw('MAX(d.name) as device_name'),
                DB::raw(Schema::hasColumn('devices', 'branch_id') ? 'MAX(d.branch_id) as branch_id' : "'' as branch_id"),
                DB::raw("MAX(l.{$timeCol}) as last_seen"),
                DB::raw('COUNT(l.id) as events_today'),
            )
            ->groupBy('d.id');
        } else {
            $q->select(
                'd.id as device_id',
                'd.name as device_name',
                Schema::hasColumn('devices', 'branch_id') ? 'd.branch_id' : DB::raw("'' as branch_id"),
                DB::raw('NULL as last_seen'),
                DB::raw('0 as events_today'),
            );
        }

        return $q->get()->map(fn($r) => (array) $r)->all();
    }

    private function findLogsTable(): ?string
    {
        foreach (['device_logs', 'devices_logs', 'device_events'] as $candidate) {
            if (Schema::hasTable($candidate)) {
                return $candidate;
            }
        }
        return null;
    }
}
