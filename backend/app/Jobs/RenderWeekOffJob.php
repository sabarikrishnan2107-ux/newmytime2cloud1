<?php

namespace App\Jobs;

use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\ScheduleEmployee;
use App\Models\Shift;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RenderWeekOffJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected const DAY_CODE_MAP = [
        'Su' => 0, 'M' => 1, 'T' => 2, 'W' => 3, 'Th' => 4, 'F' => 5, 'S' => 6,
    ];

    public $tries = 2;
    public $timeout = 300;

    protected $companyId;
    protected $month;
    protected $year;
    protected $employeeId;

    /**
     * @param int|string $month YYYY-MM (e.g. "2026-04") or month number 1-12 (uses current year).
     */
    public function __construct($companyId, $month, $employeeId, ?int $year = null)
    {
        $this->companyId = (int) $companyId;
        $this->employeeId = $employeeId;

        if (is_string($month) && preg_match('/^(\d{4})-(\d{1,2})$/', $month, $m)) {
            $this->year = (int) $m[1];
            $this->month = (int) $m[2];
        } else {
            $this->month = (int) $month;
            $this->year = $year ?? (int) now()->year;
        }
    }

    public function handle(): void
    {
        $log = Log::channel('weekoff');
        $ctx = [
            'company_id' => $this->companyId,
            'employee_id' => $this->employeeId,
            'year' => $this->year,
            'month' => $this->month,
        ];

        // Idempotent reset — only for this company + employee + year + month.
        $this->scope(Attendance::query())
            ->where('status', 'O')
            ->update(['status' => 'A']);

        $rules = $this->resolveWeekoffRules();
        if ($rules) {
            $type = $rules['type'] ?? null;
            if ($type === 'Fixed') {
                $this->applyFixed($rules, $log, $ctx);
            } elseif ($type === 'Flexible') {
                $this->applyFlexible($rules, $log, $ctx);
            } else {
                $log->info("Unknown weekoff_rules type: {$type}", $ctx);
            }
        } else {
            $log->info('No weekoff_rules resolved — skipping weekoff assignment.', $ctx);
        }

        // Always promote any remaining Absent days that have logs to Present.
        $this->promoteAbsentsWithLogs($log, $ctx);

        // Heal rows that have a status (P/M/EG/LC) but blank in/out, using logs.
        $this->fillBlankInOutFromLogs($log, $ctx);

        // Fill total_hrs for any row that has in and out but no total_hrs.
        $this->fillMissingTotalHrs($log, $ctx);
    }

    protected function scope($query)
    {
        return $query->where('company_id', $this->companyId)
            ->where('employee_id', $this->employeeId)
            ->whereYear('date', $this->year)
            ->whereMonth('date', $this->month);
    }

    protected function resolveWeekoffRules(): ?array
    {
        $schedule = ScheduleEmployee::where('company_id', $this->companyId)
            ->where('employee_id', $this->employeeId)
            ->first();
        if (!$schedule || !$schedule->shift_id) return null;

        $shift = Shift::where('company_id', $this->companyId)
            ->where('id', $schedule->shift_id)
            ->first();
        if (!$shift || empty($shift->weekoff_rules)) return null;

        $rules = is_array($shift->weekoff_rules)
            ? $shift->weekoff_rules
            : json_decode($shift->weekoff_rules, true);

        return is_array($rules) ? $rules : null;
    }

    protected function applyFixed(array $rules, $log, array $ctx): void
    {
        $days = $rules['days'] ?? [];
        $targetDows = [];
        foreach ($days as $code) {
            if (isset(self::DAY_CODE_MAP[$code])) {
                $targetDows[] = self::DAY_CODE_MAP[$code];
            }
        }
        if (empty($targetDows)) {
            $log->info('Fixed weekoff has no valid day codes.', $ctx + ['days' => $days]);
            return;
        }

        $absents = $this->scope(Attendance::query())
            ->where('status', 'A')
            ->get(['id', 'date']);

        $ids = [];
        foreach ($absents as $row) {
            if (in_array(Carbon::parse($row->date)->dayOfWeek, $targetDows, true)) {
                $ids[] = $row->id;
            }
        }

        if ($ids) {
            $updated = Attendance::whereIn('id', $ids)->update(['status' => 'O']);
            $log->info("Fixed: converted {$updated} A → O.", $ctx);
            $this->promoteWorkedWeekoffs($log, $ctx);
        } else {
            $log->info('Fixed: no matching absent days for target weekdays.', $ctx);
        }
    }

    protected function applyFlexible(array $rules, $log, array $ctx): void
    {
        $count = (int) ($rules['count'] ?? 0);
        $cycle = $rules['cycle'] ?? 'Weekly';

        if ($count <= 0) {
            $log->info('Flexible: count <= 0, nothing to assign.', $ctx);
            return;
        }

        $absents = $this->scope(Attendance::query())
            ->where('status', 'A')
            ->orderBy('date')
            ->get(['id', 'date']);

        $ids = [];
        if ($cycle === 'Monthly') {
            $ids = $absents->take($count)->pluck('id')->all();
        } else {
            $byWeek = [];
            foreach ($absents as $row) {
                $byWeek[Carbon::parse($row->date)->format('o-W')][] = $row;
            }
            foreach ($byWeek as $weekRows) {
                foreach (array_slice($weekRows, 0, $count) as $row) {
                    $ids[] = $row->id;
                }
            }
        }

        if ($ids) {
            $updated = Attendance::whereIn('id', $ids)->update(['status' => 'O']);
            $log->info("Flexible ({$cycle}, count={$count}): converted {$updated} A → O.", $ctx);
            $this->promoteWorkedWeekoffs($log, $ctx);
        } else {
            $log->info("Flexible ({$cycle}, count={$count}): no absents to convert.", $ctx);
        }
    }

    protected function fillBlankInOutFromLogs($log, array $ctx): void
    {
        $rows = $this->scope(Attendance::query())
            ->whereIn('status', ['P', 'M', 'EG', 'LC'])
            ->where(function ($q) {
                $q->where('in', '---')->orWhere('in', '')
                    ->orWhere('out', '---')->orWhere('out', '');
            })
            ->get(['id', 'date', 'status', 'in', 'out']);

        if ($rows->isEmpty()) return;

        $toYmd = fn($d) => $d instanceof \DateTimeInterface
            ? $d->format('Y-m-d')
            : Carbon::parse((string) $d)->format('Y-m-d');

        $dates = $rows->pluck('date')->map($toYmd)->all();

        $logRows = AttendanceLog::where('company_id', $this->companyId)
            ->where('UserID', (string) $this->employeeId)
            ->whereIn('log_date', $dates)
            ->selectRaw('log_date, MIN("LogTime") AS first_log, MAX("LogTime") AS last_log, COUNT(*) AS c')
            ->groupBy('log_date')
            ->get()
            ->keyBy(fn($r) => $toYmd($r->log_date));

        $healed = 0;
        $isBlank = fn($v) => $v === null || $v === '---' || $v === '';
        foreach ($rows as $row) {
            $key = $toYmd($row->date);
            if (!isset($logRows[$key])) continue;
            $r = $logRows[$key];

            $update = [];
            if ($isBlank($row->in)) {
                $update['in'] = $this->formatHm($r->first_log);
            }
            if ($isBlank($row->out) && (int) $r->c > 1) {
                $update['out'] = $this->formatHm($r->last_log);
            }

            if (!$update) continue;

            $newIn = $update['in'] ?? $row->in;
            $newOut = $update['out'] ?? $row->out;

            // If status was Missing and we now have both in and out, mark Present.
            if ($row->status === 'M' && !$isBlank($newIn) && !$isBlank($newOut)) {
                $update['status'] = Attendance::PRESENT;
            }

            // Compute total_hrs when both in and out are present.
            if (!$isBlank($newIn) && !$isBlank($newOut)) {
                $update['total_hrs'] = $this->computeTotalHrs($newIn, $newOut);
            }

            Attendance::where('id', $row->id)->update($update);
            $healed++;
        }

        if ($healed) {
            $log->info("Filled in/out from logs on {$healed} rows.", $ctx);
        }
    }

    protected function promoteAbsentsWithLogs($log, array $ctx): void
    {
        $absents = $this->scope(Attendance::query())
            ->where('status', 'A')
            ->get(['id', 'date', 'in', 'out']);

        if ($absents->isEmpty()) return;

        $toYmd = fn($d) => $d instanceof \DateTimeInterface
            ? $d->format('Y-m-d')
            : Carbon::parse((string) $d)->format('Y-m-d');

        $dates = $absents->pluck('date')->map($toYmd)->all();

        $logRows = AttendanceLog::where('company_id', $this->companyId)
            ->where('UserID', (string) $this->employeeId)
            ->whereIn('log_date', $dates)
            ->selectRaw('log_date, MIN("LogTime") AS first_log, MAX("LogTime") AS last_log, COUNT(*) AS c')
            ->groupBy('log_date')
            ->get()
            ->keyBy(fn($r) => $toYmd($r->log_date));

        $promoted = 0;
        $isBlank = fn($v) => $v === null || $v === '---' || $v === '';
        foreach ($absents as $row) {
            $key = $toYmd($row->date);
            if (!isset($logRows[$key])) continue;
            $r = $logRows[$key];

            // Preserve in/out if shift controller already set them; otherwise use logs.
            $in = $isBlank($row->in) ? $this->formatHm($r->first_log) : $row->in;
            $out = $isBlank($row->out)
                ? ((int) $r->c > 1 ? $this->formatHm($r->last_log) : '---')
                : $row->out;

            $payload = [
                'status' => Attendance::PRESENT,
                'in' => $in,
                'out' => $out,
            ];
            if (!$isBlank($in) && !$isBlank($out)) {
                $payload['total_hrs'] = $this->computeTotalHrs($in, $out);
            }
            Attendance::where('id', $row->id)->update($payload);
            $promoted++;
        }

        if ($promoted) {
            $log->info("Promoted {$promoted} A → P (absent days with logs).", $ctx);
        }
    }

    protected function promoteWorkedWeekoffs($log, array $ctx): void
    {
        $weekoffs = $this->scope(Attendance::query())
            ->where('status', 'O')
            ->get(['id', 'date', 'in', 'out']);

        if ($weekoffs->isEmpty()) return;

        $toYmd = fn($d) => $d instanceof \DateTimeInterface
            ? $d->format('Y-m-d')
            : Carbon::parse((string) $d)->format('Y-m-d');

        $dates = $weekoffs->pluck('date')->map($toYmd)->all();

        $logRows = AttendanceLog::where('company_id', $this->companyId)
            ->where('UserID', (string) $this->employeeId)
            ->whereIn('log_date', $dates)
            ->selectRaw('log_date, MIN("LogTime") AS first_log, MAX("LogTime") AS last_log, COUNT(*) AS c')
            ->groupBy('log_date')
            ->get()
            ->keyBy(fn($r) => $toYmd($r->log_date));

        $promoted = 0;
        $isBlank = fn($v) => $v === null || $v === '---' || $v === '';
        foreach ($weekoffs as $row) {
            $key = $toYmd($row->date);
            if (!isset($logRows[$key])) continue;
            $r = $logRows[$key];

            $in = $isBlank($row->in) ? $this->formatHm($r->first_log) : $row->in;
            $out = $isBlank($row->out)
                ? ((int) $r->c > 1 ? $this->formatHm($r->last_log) : '---')
                : $row->out;

            $payload = [
                'status' => Attendance::PRESENT,
                'in' => $in,
                'out' => $out,
            ];
            if (!$isBlank($in) && !$isBlank($out)) {
                $payload['total_hrs'] = $this->computeTotalHrs($in, $out);
            }
            Attendance::where('id', $row->id)->update($payload);
            $promoted++;
        }

        if ($promoted) {
            $log->info("Promoted {$promoted} O → P (worked on weekoff).", $ctx);
        }
    }

    protected function fillMissingTotalHrs($log, array $ctx): void
    {
        $rows = $this->scope(Attendance::query())
            ->whereIn('status', ['P', 'M', 'EG', 'LC'])
            ->where(function ($q) {
                $q->where('total_hrs', '---')->orWhere('total_hrs', '')->orWhereNull('total_hrs');
            })
            ->where('in', '!=', '---')
            ->where('out', '!=', '---')
            ->get(['id', 'in', 'out']);

        $updated = 0;
        foreach ($rows as $row) {
            $total = $this->computeTotalHrs((string) $row->in, (string) $row->out);
            if ($total === '---') continue;
            Attendance::where('id', $row->id)->update(['total_hrs' => $total]);
            $updated++;
        }

        if ($updated) {
            $log->info("Filled total_hrs on {$updated} rows.", $ctx);
        }
    }

    protected function computeTotalHrs(string $in, string $out): string
    {
        if ($in === '---' || $out === '---') return '---';
        try {
            $inT = strtotime($in);
            $outT = strtotime($out);
            if ($outT < $inT) $outT += 86400; // cross-midnight
            $mins = max(0, (int) floor(($outT - $inT) / 60));
            return sprintf('%02d:%02d', intdiv($mins, 60), $mins % 60);
        } catch (\Throwable $e) {
            return '---';
        }
    }

    protected function formatHm($value): string
    {
        if (!$value) return '---';
        try {
            return Carbon::parse((string) $value)->format('H:i');
        } catch (\Throwable $e) {
            return '---';
        }
    }
}
