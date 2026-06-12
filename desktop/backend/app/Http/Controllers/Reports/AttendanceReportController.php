<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Company;
use App\Services\Attendance\AttendanceWeekOffService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AttendanceReportController extends Controller
{
    /**
     * Daily Attendance Report PDF
     */
    public function dailyPDF(Request $request)
    {
        $request->merge([
            'from_date' => $request->date ?? date('Y-m-d'),
            'to_date' => $request->date ?? date('Y-m-d'),
            'report_mode' => 'daily',
        ]);

        return $this->monthlyDetailPDF($request);
    }

    /**
     * Monthly Attendance Report - Per Employee Detail
     */
    public function monthlyDetailPDF(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $companyId = $request->company_id;
        $fromDate = $request->from_date ?? Carbon::now()->startOfMonth()->format('Y-m-d');
        $toDate = $request->to_date ?? Carbon::now()->endOfMonth()->format('Y-m-d');

        $company = Company::select('id', 'name', 'logo')->find($companyId);

        $shiftTypeId = $request->shift_type_id;
        $isMultiShift = in_array($shiftTypeId, [2, '2']);
        $isSplitShift = in_array($shiftTypeId, [5, '5']);
        $reportMode = $request->input('report_mode', 'monthly');

        $selectColumns = [
            'id', 'employee_id', 'company_id', 'date', 'shift_id', 'shift_type_id',
            'in', 'out', 'total_hrs', 'ot', 'late_coming', 'early_going',
            'status', 'device_id_in', 'device_id_out', 'is_manual_entry'
        ];

        if ($isMultiShift || $isSplitShift || $reportMode === 'daily') {
            $selectColumns[] = 'logs';
        }

        $query = Attendance::select($selectColumns)
            ->where('company_id', $companyId)
            ->whereBetween('date', [$fromDate, $toDate])
            ->with([
                'employee' => function ($q) use ($companyId) {
                    $q->where('company_id', $companyId)
                      ->select('system_user_id', 'first_name', 'last_name', 'employee_id', 'department_id', 'branch_id', 'profile_picture', 'company_id')
                      ->withOut('schedule');
                },
                'employee.department:id,name',
                'employee.branch:id,branch_name',
                'employee.schedule' => function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                    $q->withOut('shift_type');
                },
                'employee.schedule.shift',
                'shift:id,name',
                'shift_type:id,name',
                'device_in:device_id,name',
                'device_out:device_id,name',
            ]);

        if ($request->filled('branch_ids')) {
            $branchIds = is_array($request->branch_ids) ? $request->branch_ids : explode(',', $request->branch_ids);
            $query->whereHas('employee', fn($q) => $q->whereIn('branch_id', $branchIds));
        }

        if ($request->filled('department_ids')) {
            $deptIds = is_array($request->department_ids) ? $request->department_ids : explode(',', $request->department_ids);
            $query->whereHas('employee', fn($q) => $q->whereIn('department_id', $deptIds));
        }

        if ($request->filled('employee_ids')) {
            $empIds = is_array($request->employee_ids) ? $request->employee_ids : explode(',', $request->employee_ids);
            $query->whereIn('employee_id', $empIds);
        }

        $allRecords = $query->orderBy('employee_id')->orderBy('date')->get();

        // Recalculate weekoff statuses (converts some "A" to "O" in-memory)
        AttendanceWeekOffService::recalculateForReport($allRecords, (int) $companyId);

        // Repair employee relations for legacy rows where attendances.employee_id holds
        // the badge value instead of system_user_id. Without this they render as '---'.
        Attendance::rehydrateEmployeesByBadge($allRecords, (int) $companyId);

        $employees = $allRecords->groupBy('employee_id')->map(function ($records) use ($isMultiShift, $isSplitShift) {
            $employee = $records->first()->employee;

            $shiftTypeMap = [1 => 'FILO', 2 => 'Multi', 3 => 'Auto', 4 => 'Night', 5 => 'Split', 6 => 'Single'];

            $days = [];
            foreach ($records as $record) {
                $rawDate = $record->getRawOriginal('date');
                // Detect missing: has IN but no OUT (or vice versa) — single shift only
                $inTime = $record->in ?? '---';
                $outTime = $record->out ?? '---';
                $status = $record->status ?? '---';

                if (!$isMultiShift && !$isSplitShift) {
                    $hasIn = $inTime !== '---' && $inTime !== '' && $inTime !== null;
                    $hasOut = $outTime !== '---' && $outTime !== '' && $outTime !== null;

                    if (($hasIn !== $hasOut) && in_array($status, ['P', 'A', 'LC', 'EG', '---'])) {
                        $status = 'M';
                        $record->status = 'M';
                    }
                }

                $dayData = [
                    'date' => Carbon::parse($rawDate)->format('d M y'),
                    'day' => Carbon::parse($rawDate)->format('l'),
                    'shift' => $record->shift->name ?? '---',
                    'shift_type' => $shiftTypeMap[$record->shift_type_id] ?? '---',
                    'in' => $inTime,
                    'out' => $outTime,
                    'late_coming' => ($record->late_coming && $record->late_coming !== '---') ? $record->late_coming : '---',
                    'early_going' => ($record->early_going && $record->early_going !== '---') ? $record->early_going : '---',
                    'total_hrs' => $record->total_hrs ?? '---',
                    'ot' => ($record->ot && $record->ot !== '00:00') ? $record->ot : '---',
                    'status' => $status,
                    'device_in' => $record->device_in->name ?? '',
                    'device_out' => $record->device_out->name ?? '',
                    'is_manual' => $record->is_manual_entry
                        || str_contains(strtolower($record->device_id_in ?? ''), 'manual')
                        || str_contains(strtolower($record->device_id_out ?? ''), 'manual'),
                ];

                if ($isMultiShift || $isSplitShift) {
                    $logs = $record->logs ?? [];
                    // Check missing: any session with IN but no OUT (or vice versa)
                    $hasMissingPair = false;
                    foreach ($logs as $log) {
                        $logIn = $log['in'] ?? '---';
                        $logOut = $log['out'] ?? '---';
                        $logHasIn = $logIn !== '---' && $logIn !== '';
                        $logHasOut = $logOut !== '---' && $logOut !== '';
                        if ($logHasIn !== $logHasOut) {
                            $hasMissingPair = true;
                            break;
                        }
                    }
                    if ($hasMissingPair && in_array($dayData['status'], ['P', 'A', 'LC', 'EG', '---'])) {
                        $dayData['status'] = 'M';
                        $record->status = 'M';
                    }
                    $dayData['logs'] = $logs;
                }

                $days[] = $dayData;
            }

            // Recalculate stats after weekoff recalculation
            $statuses = $records->pluck('status');
            $stats = [
                'present' => $statuses->filter(fn($s) => in_array($s, ['P', 'LC', 'EG']))->count(),
                'absent' => $statuses->filter(fn($s) => $s === 'A')->count(),
                'late' => $statuses->filter(fn($s) => $s === 'LC')->count(),
                'leave' => $statuses->filter(fn($s) => $s === 'L')->count(),
                'holiday' => $statuses->filter(fn($s) => $s === 'H')->count(),
                'week_off' => $statuses->filter(fn($s) => $s === 'O')->count(),
                'missing' => $statuses->filter(fn($s) => $s === 'M')->count(),
                'manual' => $records->filter(fn($r) =>
                    $r->is_manual_entry
                    || str_contains(strtolower($r->device_id_in ?? ''), 'manual')
                    || str_contains(strtolower($r->device_id_out ?? ''), 'manual')
                )->count(),
                'total_hours' => $records->sum(fn($r) => $this->timeToMinutes($r->total_hrs)),
                'total_ot' => $records->sum(fn($r) => $this->timeToMinutes($r->ot)),
                'total_late' => $records->sum(fn($r) => $this->timeToMinutes($r->late_coming)),
            ];

            return [
                'employee' => $employee,
                'days' => $days,
                'stats' => $stats,
            ];
        });

        $filters = $this->buildFilterLabels($request, null, $fromDate, $toDate);

        // Daily mode: branch-grouped, shift-type-sectioned (single+night | split | multi)
        // Monthly mode: per-employee block (existing behaviour)
        $viewName = $reportMode === 'daily'
            ? 'pdf.reports.daily-detail'
            : 'pdf.reports.monthly-detail';

        $pdf = Pdf::loadView($viewName, compact(
            'company', 'employees', 'fromDate', 'toDate', 'filters', 'isMultiShift', 'isSplitShift', 'reportMode'
        ));

        $pdf->setPaper('a4', 'landscape');
        $pdf->setOption('isPhpEnabled', true);
        $pdf->setOption('isRemoteEnabled', true);

        // dompdf uses file_get_contents() for remote images and has no socket timeout
        // of its own, so a single slow/unreachable image URL can hang the whole render
        // long enough for the queue worker to kill the mail job. Force a short timeout
        // for this render only — failed images render as broken-image stubs instead of
        // hanging the whole PDF.
        $previousSocketTimeout = ini_get('default_socket_timeout');
        ini_set('default_socket_timeout', '5');

        try {
            // Render first, then add footer to every page
            $pdf->render();
        } finally {
            ini_set('default_socket_timeout', $previousSocketTimeout);
        }
        $canvas = $pdf->getDomPDF()->getCanvas();
        $fontMetrics = $pdf->getDomPDF()->getFontMetrics();
        $font = $fontMetrics->getFont('Helvetica', 'normal');
        $w = $canvas->get_width();
        $h = $canvas->get_height();
        $y = $h - 25;
        $grey = [0.12, 0.15, 0.20];
        $generatedOn = 'GENERATED ON:  ' . Carbon::now()->format('d M Y, H:i');

        $canvas->page_text(28, $y, $generatedOn, $font, 6, $grey);
        $canvas->page_text($w / 2 - 80, $y, 'CONFIDENTIAL REPORT  .  MYTIME2CLOUD.COM', $font, 6, $grey);
        $canvas->page_text($w - 110, $y, 'PAGE {PAGE_NUM} OF {PAGE_COUNT}', $font, 6, $grey);

        $filename = 'Monthly_Attendance_Detail_' . $fromDate . '_to_' . $toDate . '.pdf';

        if ($request->input('action') === 'download') {
            return response($pdf->getDomPDF()->output(), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        }

        return response($pdf->getDomPDF()->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Daily Attendance Report JSON — for Puppeteer HTML template
     *
     * Returns employees grouped by branch, then by shift category
     * (single_night | split | multi). Auto shift is routed by pair count.
     */
    public function dailyReportJson(Request $request)
    {
        set_time_limit(180);
        ini_set('memory_limit', '512M');

        $request->merge([
            'from_date' => $request->date ?? $request->from_date ?? date('Y-m-d'),
            'to_date'   => $request->date ?? $request->to_date   ?? date('Y-m-d'),
            'report_mode' => 'daily',
        ]);

        $companyId = $request->company_id;
        $fromDate  = $request->from_date;

        $company = Company::select('id', 'name', 'logo')->find($companyId);

        $selectColumns = [
            'id', 'employee_id', 'company_id', 'date', 'shift_id', 'shift_type_id',
            'in', 'out', 'total_hrs', 'ot', 'late_coming', 'early_going',
            'status', 'device_id_in', 'device_id_out', 'is_manual_entry', 'logs',
        ];

        $query = Attendance::select($selectColumns)
            ->where('company_id', $companyId)
            ->whereBetween('date', [$fromDate, $fromDate])
            ->with([
                'employee' => function ($q) use ($companyId) {
                    $q->where('company_id', $companyId)
                      ->select('system_user_id', 'first_name', 'last_name', 'employee_id', 'department_id', 'branch_id', 'profile_picture', 'company_id')
                      ->withOut('schedule');
                },
                'employee.department:id,name',
                'employee.branch:id,branch_name',
                'shift:id,name,on_duty_time,off_duty_time',
                'shift_type:id,name',
                'device_in:device_id,name',
                'device_out:device_id,name',
            ]);

        if ($request->filled('branch_ids')) {
            $branchIds = is_array($request->branch_ids) ? $request->branch_ids : explode(',', $request->branch_ids);
            $query->whereHas('employee', fn($q) => $q->whereIn('branch_id', $branchIds));
        }
        if ($request->filled('department_ids')) {
            $deptIds = is_array($request->department_ids) ? $request->department_ids : explode(',', $request->department_ids);
            $query->whereHas('employee', fn($q) => $q->whereIn('department_id', $deptIds));
        }
        if ($request->filled('employee_ids')) {
            $empIds = is_array($request->employee_ids) ? $request->employee_ids : explode(',', $request->employee_ids);
            $query->whereIn('employee_id', $empIds);
        }

        $records = $query->orderBy('employee_id')->get();
        AttendanceWeekOffService::recalculateForReport($records, (int) $companyId);

        // Repair employee relations for legacy rows where attendances.employee_id holds
        // the badge value instead of system_user_id. Without this they render as '---'.
        Attendance::rehydrateEmployeesByBadge($records, (int) $companyId);

        $shiftTypeMap = [1 => 'FILO', 2 => 'Multi', 3 => 'Auto', 4 => 'Night', 5 => 'Split', 6 => 'Single'];

        // Category router: same logic as the Blade template
        $categorize = function ($typeLabel, $logs, $in, $out) {
            if (in_array($typeLabel, ['Single', 'Night', 'FILO'])) return 'single_night';
            if ($typeLabel === 'Split') return 'split';
            if ($typeLabel === 'Multi') return 'multi';
            if ($typeLabel === 'Auto') {
                $pairs = 0;
                foreach (($logs ?? []) as $l) {
                    $li = $l['in']  ?? null;
                    $lo = $l['out'] ?? null;
                    if (($li && $li !== '---') || ($lo && $lo !== '---')) $pairs++;
                }
                if ($pairs === 0 && (($in && $in !== '---') || ($out && $out !== '---'))) $pairs = 1;
                if ($pairs <= 1) return 'single_night';
                if ($pairs === 2) return 'split';
                return 'multi';
            }
            return 'single_night';
        };

        // Group by branch, then by section
        $byBranch = [];
        foreach ($records as $r) {
            $emp = $r->employee;
            if (!$emp) continue;

            $branchId   = $emp->branch_id ?? 0;
            $branchName = $emp->branch->branch_name ?? 'No Branch';

            // Compute missing-status correction (same as existing logic)
            $status  = $r->status ?? '---';
            $in      = $r->in  ?? '---';
            $out     = $r->out ?? '---';
            $logs    = $r->logs ?? [];

            $hasIn  = $in  !== '---' && $in  !== '' && $in  !== null;
            $hasOut = $out !== '---' && $out !== '' && $out !== null;

            $typeLabel = $shiftTypeMap[$r->shift_type_id] ?? '---';
            $isMulti = in_array($r->shift_type_id, [2, 3]); // Multi + Auto
            $isSplit = $r->shift_type_id === 5;

            if (!$isMulti && !$isSplit) {
                if (($hasIn !== $hasOut) && in_array($status, ['P', 'A', 'LC', 'EG', '---'])) {
                    $status = 'M';
                }
            } else {
                foreach ($logs as $log) {
                    $lhI = ($log['in']  ?? '---') !== '---' && !empty($log['in']);
                    $lhO = ($log['out'] ?? '---') !== '---' && !empty($log['out']);
                    if ($lhI !== $lhO && in_array($status, ['P', 'A', 'LC', 'EG', '---'])) {
                        $status = 'M';
                        break;
                    }
                }
            }

            $category = $categorize($typeLabel, $logs, $in, $out);

            if (!isset($byBranch[$branchId])) {
                $byBranch[$branchId] = [
                    'branch_id'   => $branchId,
                    'branch_name' => $branchName,
                    'sections'    => [
                        'single_night' => ['employees' => []],
                        'split'        => ['employees' => []],
                        'multi'        => ['employees' => []],
                    ],
                ];
            }

            // Build "HH:MM - HH:MM" from shift's on_duty_time/off_duty_time (strip seconds)
            $shiftTime = null;
            if ($r->shift) {
                $bi = $r->shift->on_duty_time  ?? null;
                $bo = $r->shift->off_duty_time ?? null;
                if ($bi && $bo) {
                    $shiftTime = substr($bi, 0, 5) . ' - ' . substr($bo, 0, 5);
                }
            }

            // Bottom line: combine shift name + type, e.g. "Day Duty single", "Night Shift"
            $shiftName = $r->shift->name ?? null;
            $bottomLine = trim(($shiftName ?? '') . ' ' . ($typeLabel === '---' ? '' : $typeLabel));
            if ($bottomLine === '') $bottomLine = '---';

            $byBranch[$branchId]['sections'][$category]['employees'][] = [
                'name'        => trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? '')) ?: '---',
                'employee_id' => $emp->employee_id ?? '---',
                'department'  => $emp->department->name ?? null,
                'profile'     => $emp->profile_picture ?? null,
                'shift_time'  => $shiftTime,           // top line — "08:00 - 17:00" or null
                'shift_name'  => $shiftName ?? '---',  // raw shift name (kept for compatibility)
                'shift_label' => $bottomLine,          // bottom line — "Day Duty single" / "Night Shift"
                'shift_type'  => $typeLabel,
                'in'          => $hasIn  ? $in  : null,
                'out'         => $hasOut ? $out : null,
                'device_in'   => $r->device_in->name  ?? null,
                'device_out'  => $r->device_out->name ?? null,
                'late'        => ($r->late_coming && $r->late_coming !== '---' && $r->late_coming !== '00:00') ? $r->late_coming : null,
                'early'       => ($r->early_going && $r->early_going !== '---' && $r->early_going !== '00:00') ? $r->early_going : null,
                'ot'          => ($r->ot && $r->ot !== '---' && $r->ot !== '00:00') ? $r->ot : null,
                'total_hrs'   => ($r->total_hrs && $r->total_hrs !== '---') ? $r->total_hrs : null,
                'status'      => $status,
                'is_manual'   => (bool) $r->is_manual_entry
                                 || str_contains(strtolower($r->device_id_in ?? ''), 'manual')
                                 || str_contains(strtolower($r->device_id_out ?? ''), 'manual'),
                'logs'        => array_values(array_map(function ($log) {
                    return [
                        'in'         => ($log['in']  ?? null) === '---' ? null : ($log['in']  ?? null),
                        'out'        => ($log['out'] ?? null) === '---' ? null : ($log['out'] ?? null),
                        'device_in'  => $log['device_in']  ?? null,
                        'device_out' => $log['device_out'] ?? null,
                    ];
                }, $logs)),
            ];
        }

        // Compute per-section summary counts
        foreach ($byBranch as &$b) {
            foreach ($b['sections'] as $key => &$sec) {
                $sum = ['present' => 0, 'absent' => 0, 'weekoff' => 0, 'leave' => 0, 'holiday' => 0, 'missing' => 0, 'manual' => 0];
                foreach ($sec['employees'] as $e) {
                    switch ($e['status']) {
                        case 'P': case 'LC': case 'EG': $sum['present']++; break;
                        case 'A': $sum['absent']++; break;
                        case 'O': $sum['weekoff']++; break;
                        case 'L': case 'V': $sum['leave']++; break;
                        case 'H': $sum['holiday']++; break;
                        case 'M': $sum['missing']++; break;
                    }
                    if ($e['is_manual']) $sum['manual']++;
                }
                $sec['summary'] = $sum;
                $sec['count']   = count($sec['employees']);
            }
            unset($sec); // break inner reference to prevent foreach-reference gotcha
        }
        unset($b); // break outer reference — next foreach would overwrite last element otherwise

        // Drop empty branches and order sections predictably
        $branches = [];
        foreach ($byBranch as $b) {
            $hasAny = $b['sections']['single_night']['count'] > 0
                   || $b['sections']['split']['count']        > 0
                   || $b['sections']['multi']['count']        > 0;
            if ($hasAny) $branches[] = $b;
        }

        $logoRaw = $company ? $company->getRawOriginal('logo') : null;
        $logoUrl = $logoRaw ? url('upload/' . $logoRaw) : null;

        return response()->json([
            'company' => [
                'name' => $company->name ?? 'Company',
                'logo' => $logoUrl,
            ],
            'period' => [
                'date' => Carbon::parse($fromDate)->format('d-M-Y'),
                'day'  => Carbon::parse($fromDate)->format('l'),
                'raw'  => $fromDate,
            ],
            'generated_at' => Carbon::now()->format('d-M-Y H:i'),
            'branches'     => $branches,
        ]);
    }

    /**
     * Monthly Attendance Report - Grid/Matrix View
     */
    public function monthlyGridPDF(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $companyId = $request->company_id;
        $fromDate = $request->from_date ?? Carbon::now()->startOfMonth()->format('Y-m-d');
        $toDate = $request->to_date ?? Carbon::now()->endOfMonth()->format('Y-m-d');

        $company = Company::select('id', 'name')->find($companyId);

        $query = Attendance::select(['id', 'employee_id', 'company_id', 'date', 'status'])
            ->where('company_id', $companyId)
            ->whereBetween('date', [$fromDate, $toDate])
            ->with([
                'employee' => function ($q) use ($companyId) {
                    $q->where('company_id', $companyId)
                      ->select('system_user_id', 'first_name', 'last_name', 'employee_id', 'department_id', 'company_id');
                },
                'employee.department:id,name',
            ]);

        if ($request->filled('branch_ids')) {
            $branchIds = is_array($request->branch_ids) ? $request->branch_ids : explode(',', $request->branch_ids);
            $query->whereHas('employee', fn($q) => $q->whereIn('branch_id', $branchIds));
        }

        if ($request->filled('department_ids')) {
            $deptIds = is_array($request->department_ids) ? $request->department_ids : explode(',', $request->department_ids);
            $query->whereHas('employee', fn($q) => $q->whereIn('department_id', $deptIds));
        }

        if ($request->filled('employee_ids')) {
            $empIds = is_array($request->employee_ids) ? $request->employee_ids : explode(',', $request->employee_ids);
            $query->whereIn('employee_id', $empIds);
        }

        $allRecords = $query->orderBy('employee_id')->orderBy('date')->get();

        $start = Carbon::parse($fromDate);
        $end = Carbon::parse($toDate);
        $dates = [];
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $dates[] = $d->format('Y-m-d');
        }

        $grid = $allRecords->groupBy('employee_id')->map(function ($records) use ($dates) {
            $employee = $records->first()->employee;
            $byDate = $records->keyBy(fn($r) => $r->getRawOriginal('date'));

            $row = [];
            $summary = ['P' => 0, 'A' => 0, 'L' => 0, 'H' => 0, 'O' => 0, 'M' => 0, 'LC' => 0, 'EG' => 0];

            foreach ($dates as $date) {
                $record = $byDate->get($date);
                $status = $record ? $record->status : '-';
                $row[$date] = $status;
                if (isset($summary[$status])) $summary[$status]++;
            }

            $summary['present'] = $summary['P'] + $summary['LC'] + $summary['EG'];

            return [
                'employee' => $employee,
                'dates' => $row,
                'summary' => $summary,
            ];
        });

        $filters = $this->buildFilterLabels($request, null, $fromDate, $toDate);

        $pdf = Pdf::loadView('pdf.reports.monthly-grid', compact(
            'company', 'grid', 'dates', 'fromDate', 'toDate', 'filters'
        ));

        $pdf->setPaper('a4', 'landscape');
        $pdf->setOption('isPhpEnabled', true);
        $pdf->setOption('isRemoteEnabled', false);

        $filename = 'Monthly_Attendance_Grid_' . $fromDate . '_to_' . $toDate . '.pdf';

        if ($request->input('action') === 'download') {
            return $pdf->download($filename);
        }

        return $pdf->stream($filename);
    }

    private function buildFilterLabels(Request $request, $date = null, $fromDate = null, $toDate = null)
    {
        $labels = [];
        if ($date) $labels['Date'] = Carbon::parse($date)->format('d M Y');
        if ($fromDate && $toDate) $labels['Period'] = Carbon::parse($fromDate)->format('d M Y') . ' - ' . Carbon::parse($toDate)->format('d M Y');
        $labels['Generated'] = Carbon::now()->format('d M Y, h:i A');
        return $labels;
    }

    private function timeToMinutes($time)
    {
        if (!$time || $time === '---' || $time === '00:00') return 0;
        $parts = explode(':', $time);
        return (int)($parts[0] ?? 0) * 60 + (int)($parts[1] ?? 0);
    }
}
