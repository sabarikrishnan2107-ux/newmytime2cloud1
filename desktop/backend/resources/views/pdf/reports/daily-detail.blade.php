<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Daily Attendance Report</title>
    <style>
        @page { size: A4 landscape; margin: 30px 30px 65px 30px; }
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 8.5pt;
            color: #1f2937;
            line-height: 1.4;
            background: #fff;
            font-weight: normal;
        }

        /* ============== HEADER ============== */
        .page-header { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .page-header td { border: none; padding: 0; vertical-align: middle; }
        .header-top { padding: 4px 0 14px 0; }

        .brand-row { display: inline-table; }
        .brand-row .brand-cell { display: table-cell; vertical-align: middle; }
        .brand-mark {
            width: 48px; height: 48px;
            background: #4f46e5;
            border-radius: 8px; text-align: center; line-height: 48px;
            color: #fff; font-weight: bold; font-size: 13pt;
        }
        .brand-mark img { width: 48px; height: 48px; border-radius: 8px; object-fit: contain; }
        .brand-cell.brand-text { padding-left: 12px; }
        .company-name { font-weight: bold; font-size: 12pt; color: #0f172a; line-height: 1.15; }
        .company-tagline { font-size: 6.5pt; color: #7c3aed; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
        .company-meta { font-size: 7pt; color: #64748b; line-height: 1.4; margin-top: 4px; font-weight: normal; }
        .company-meta .sep { color: #cbd5e1; }

        .header-meta { text-align: right; border-left: 1px solid #e2e8f0; padding-left: 14px; }
        .header-meta .meta-row { font-size: 7pt; color: #64748b; line-height: 1.7; font-weight: normal; }
        .header-meta .meta-row .meta-label { color: #94a3b8; text-transform: uppercase; font-size: 6pt; font-weight: bold; margin-right: 6px; }
        .header-meta .meta-row .meta-value { color: #0f172a; font-weight: bold; font-size: 7.5pt; }

        .header-divider { height: 1px; background: #e2e8f0; margin: 0 0 10px 0; }

        .report-title-band {
            background: #f5f3ff;
            border-left: 4px solid #7c3aed;
            padding: 9px 14px 10px 16px;
            text-align: center;
        }
        .report-title-band .title { font-size: 12pt; font-weight: bold; color: #1e1b4b; text-transform: uppercase; }
        .report-title-band .subtitle { font-size: 8.5pt; color: #475569; margin-top: 5px; font-weight: normal; }
        .report-title-band .subtitle .shift-tag { color: #4338ca; font-weight: bold; }
        .report-title-band .subtitle .dot { color: #c4b5fd; }
        .report-title-band .subtitle .day-pill {
            display: inline-block; background: #4338ca; color: #fff;
            padding: 1px 9px; border-radius: 8px;
            font-weight: bold; font-size: 7.5pt;
        }

        /* ============== SUMMARY CARDS ============== */
        .summary-cards { width: 100%; border-collapse: separate; border-spacing: 5px 0; margin: 8px 0 10px 0; }
        .summary-cards td { border: 1px solid #e5e7eb; border-radius: 4px; padding: 6px 10px; background: #fff; vertical-align: middle; }
        .summary-cards .label { display: inline-block; font-size: 7pt; font-weight: bold; }
        .summary-cards .count { display: inline-block; float: right; font-size: 11pt; font-weight: bold; color: #0f172a; }
        .summary-cards .lbl-P { color: #16a34a; }
        .summary-cards .lbl-A { color: #dc2626; }
        .summary-cards .lbl-O { color: #64748b; }
        .summary-cards .lbl-L { color: #ca8a04; }
        .summary-cards .lbl-H { color: #7c3aed; }
        .summary-cards .lbl-M { color: #ea580c; }
        .summary-cards .lbl-U { color: #64748b; }

        /* ============== TABLE ============== */
        .data-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .data-table thead th {
            background: #f8fafc;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            color: #0f172a;
            padding: 5px 4px;
            font-weight: bold;
            font-size: 7.5pt;
            text-align: center;
        }
        .data-table thead th.col-emp,
        .data-table thead th.col-shift { text-align: left; }
        .data-table thead th.h-late { color: #dc2626; }
        .data-table thead th.h-early { color: #ea580c; }
        .data-table thead th.h-lost { color: #64748b; }
        .data-table thead th.h-ot { color: #7c3aed; }

        .data-table tbody td {
            padding: 4px 4px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: middle;
            text-align: center;
            font-size: 8pt;
            color: #374151;
            font-weight: normal;
        }
        .data-table tbody td.col-emp,
        .data-table tbody td.col-shift { text-align: left; }
        .data-table tbody tr { page-break-inside: avoid; }

        /* Employee cell */
        .emp-inner { border: none; border-collapse: collapse; }
        .emp-inner td { border: none; padding: 0; vertical-align: middle; background: none; }
        .emp-photo {
            width: 24px; height: 24px;
            border-radius: 12px;
            background: #e5e7eb;
            text-align: center; line-height: 24px;
            color: #6b7280; font-size: 8.5pt; font-weight: normal;
            overflow: hidden;
        }
        .emp-photo img { width: 24px; height: 24px; border-radius: 12px; object-fit: cover; }
        .emp-name { font-size: 8pt; font-weight: bold; color: #0f172a; line-height: 1.2; }
        .emp-dept { font-size: 7pt; color: #475569; line-height: 1.2; font-weight: normal; }
        .emp-dept-id { font-size: 7pt; color: #6b7280; line-height: 1.2; font-weight: normal; }

        /* Shift cell */
        .shift-time { font-size: 8pt; color: #0f172a; line-height: 1.2; font-weight: bold; }
        .shift-name { font-size: 7pt; color: #6b7280; line-height: 1.2; font-weight: normal; }

        /* Punch cell (single/split) */
        .punch-time { font-size: 8pt; color: #0f172a; line-height: 1.2; font-weight: bold; }
        .punch-dev  { font-size: 6.5pt; color: #94a3b8; line-height: 1.2; font-weight: normal; margin-bottom: 3px; }
        .punch-dev-last { font-size: 6.5pt; color: #94a3b8; line-height: 1.2; font-weight: normal; }

        /* Pair cell (multi) */
        .pair-time { font-size: 8pt; color: #0f172a; line-height: 1.2; font-weight: bold; }
        .pair-type { font-size: 6.5pt; color: #94a3b8; line-height: 1.2; font-weight: normal; }

        .dash { color: #9ca3af; }

        /* Status letters */
        .st-P  { color: #16a34a; font-weight: normal; font-size: 9pt; }
        .st-A  { color: #dc2626; font-weight: normal; font-size: 9pt; }
        .st-O  { color: #2563eb; font-weight: normal; font-size: 9pt; }
        .st-L  { color: #ca8a04; font-weight: normal; font-size: 9pt; }
        .st-H  { color: #7c3aed; font-weight: normal; font-size: 9pt; }
        .st-M  { color: #ea580c; font-weight: normal; font-size: 9pt; }
        .st-MS { color: #ea580c; font-weight: normal; font-size: 9pt; }

        /* Footer */
        .page-footer {
            width: 100%;
            border-collapse: collapse;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            margin-top: 18px;
        }
        .page-footer td { border: none; padding: 0; vertical-align: middle; font-size: 8pt; color: #6b7280; }
        .page-footer .left { text-align: left; }
        .page-footer .center { text-align: center; }
        .page-footer .right { text-align: right; }
        .page-footer .leg-P { color: #16a34a; }
        .page-footer .leg-A { color: #dc2626; }
        .page-footer .leg-O { color: #2563eb; }
        .page-footer .leg-L { color: #ca8a04; }

        .page-break { page-break-before: always; }
    </style>
</head>
<body>

@php
    use Carbon\Carbon;

    // ---- Group employees by branch ----
    $byBranch = $employees->groupBy(function ($empData) {
        return $empData['employee']->branch_id ?? 0;
    });

    // ---- Helpers ----
    // Categorize a row into the right section.
    // Auto shift is special: route by ACTUAL punch shape, not the label.
    //   1 pair  → single (day shift)
    //   2 pairs → split
    //   3+ pairs → multi
    $shiftCategory = function ($type, $day) {
        // Single, Night, FILO (Flexible) all derive 1 IN + 1 OUT
        if (in_array($type, ['Single', 'Night', 'FILO'])) return 'single_night';
        if ($type === 'Split') return 'split';
        if ($type === 'Multi') return 'multi';

        if ($type === 'Auto') {
            $logs = $day['logs'] ?? [];
            // Count actual pairs (where IN or OUT exists)
            $pairCount = 0;
            foreach ($logs as $log) {
                $li = $log['in']  ?? null;
                $lo = $log['out'] ?? null;
                $hasIn  = $li && $li !== '---';
                $hasOut = $lo && $lo !== '---';
                if ($hasIn || $hasOut) $pairCount++;
            }
            // Fallback: if no logs but day has in/out, count as 1 pair
            if ($pairCount === 0) {
                if (($day['in'] ?? '---') !== '---' || ($day['out'] ?? '---') !== '---') {
                    $pairCount = 1;
                }
            }
            if ($pairCount <= 1) return 'single_night';
            if ($pairCount === 2) return 'split';
            return 'multi';
        }

        return 'single_night';
    };

    $sectionLabel = [
        'single_night' => 'Single, Night & Flexible Shift',
        'split'        => 'Split Shift',
        'multi'        => 'Multi Shift',
    ];

    $statusLetter = function ($s) {
        return match ($s) {
            'P', 'LC', 'EG' => 'P',
            'A' => 'A',
            'O' => 'O',
            'L', 'V' => 'L',
            'H' => 'H',
            'M' => 'MISSING',
            default => $s ?? '---',
        };
    };

    $statusClass = function ($s) {
        return match ($s) {
            'P', 'LC', 'EG' => 'st-P',
            'A' => 'st-A',
            'O' => 'st-O',
            'L', 'V' => 'st-L',
            'H' => 'st-H',
            'M' => 'st-MS',
            default => 'st-O',
        };
    };

    $generatedAt = Carbon::now()->format('d-M-Y H:i');
    $reportDate  = Carbon::parse($fromDate)->format('d-M-Y');
    $reportDay   = Carbon::parse($fromDate)->format('l');

    $logoRaw  = $company->getRawOriginal('logo');
    $logoPath = $logoRaw ? public_path('upload/' . $logoRaw) : null;
    $hasLogo  = $logoPath && file_exists($logoPath);

    $totalSections = 0; // counts how many section blocks we'll render (for page-break logic)
@endphp

@php
    // Build the rendering plan: list of [branch, section_type, employees]
    $plan = [];
    foreach ($byBranch as $branchId => $branchEmps) {
        $branchName = $branchEmps->first()['employee']->branch->branch_name ?? 'No Branch';
        $groups = ['single_night' => collect(), 'split' => collect(), 'multi' => collect()];
        foreach ($branchEmps as $empData) {
            $day  = $empData['days'][0] ?? null;
            $type = $day['shift_type'] ?? '';
            $groups[$shiftCategory($type, $day)]->push($empData);
        }
        foreach (['single_night', 'split', 'multi'] as $cat) {
            if ($groups[$cat]->count()) {
                $plan[] = ['branch' => $branchName, 'type' => $cat, 'employees' => $groups[$cat]];
            }
        }
    }
@endphp

@foreach($plan as $sectionIdx => $section)
    @php
        $sec = $section['employees'];
        $branchName = $section['branch'];
        $sectionType = $section['type'];

        // Per-section summary stats
        $sumP = $sumA = $sumO = $sumL = $sumH = $sumM = $sumU = 0;
        foreach ($sec as $e) {
            $d = $e['days'][0] ?? null;
            if (!$d) continue;
            switch ($d['status']) {
                case 'P': case 'LC': case 'EG': $sumP++; break;
                case 'A': $sumA++; break;
                case 'O': $sumO++; break;
                case 'L': case 'V': $sumL++; break;
                case 'H': $sumH++; break;
                case 'M': $sumM++; break;
            }
            if (!empty($d['is_manual'])) $sumU++;
        }
    @endphp

    @if($sectionIdx > 0)
        <div class="page-break"></div>
    @endif

    {{-- ============== HEADER ============== --}}
    <table class="page-header">
        <tr>
            <td class="header-top" style="width: 60%;">
                <table class="brand-row"><tr>
                    <td class="brand-cell">
                        @if($hasLogo)
                            <div class="brand-mark"><img src="{{ $logoPath }}" /></div>
                        @else
                            <div class="brand-mark">{{ strtoupper(substr($company->name ?? 'C', 0, 2)) }}</div>
                        @endif
                    </td>
                    <td class="brand-cell brand-text">
                        <div class="company-name">{{ strtoupper($company->name ?? 'Company') }}</div>
                        <div class="company-tagline">Workforce Management System</div>
                        <div class="company-meta">
                            {{ $branchName }}
                        </div>
                    </td>
                </tr></table>
            </td>
            <td class="header-top header-meta" style="width: 40%;">
                <div class="meta-row"><span class="meta-label">Period</span><span class="meta-value">{{ $reportDate }}</span></div>
                <div class="meta-row"><span class="meta-label">Branch</span><span class="meta-value">{{ $branchName }}</span></div>
                <div class="meta-row"><span class="meta-label">Generated</span><span class="meta-value">{{ $generatedAt }}</span></div>
            </td>
        </tr>
        <tr><td colspan="2"><div class="header-divider"></div></td></tr>
        <tr>
            <td colspan="2">
                <div class="report-title-band">
                    <div class="title">Daily Attendance Report</div>
                    <div class="subtitle">
                        <span class="shift-tag">{{ $sectionLabel[$sectionType] }}</span>
                        <span class="dot">&nbsp;&bull;&nbsp;</span>
                        {{ $reportDate }}
                        <span class="dot">&nbsp;&bull;&nbsp;</span>
                        <span class="day-pill">{{ $reportDay }}</span>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    {{-- ============== SUMMARY CARDS ============== --}}
    <table class="summary-cards">
        <tr>
            <td><span class="label lbl-P">PRESENT</span><span class="count">{{ str_pad($sumP, 2, '0', STR_PAD_LEFT) }}</span></td>
            <td><span class="label lbl-A">ABSENT</span><span class="count">{{ str_pad($sumA, 2, '0', STR_PAD_LEFT) }}</span></td>
            <td><span class="label lbl-O">WEEKOFF</span><span class="count">{{ str_pad($sumO, 2, '0', STR_PAD_LEFT) }}</span></td>
            <td><span class="label lbl-L">LEAVE</span><span class="count">{{ str_pad($sumL, 2, '0', STR_PAD_LEFT) }}</span></td>
            <td><span class="label lbl-H">HOLIDAY</span><span class="count">{{ str_pad($sumH, 2, '0', STR_PAD_LEFT) }}</span></td>
            <td><span class="label lbl-M">MISSING</span><span class="count">{{ str_pad($sumM, 2, '0', STR_PAD_LEFT) }}</span></td>
            <td><span class="label lbl-U">MANUAL</span><span class="count">{{ str_pad($sumU, 2, '0', STR_PAD_LEFT) }}</span></td>
        </tr>
    </table>

    {{-- ============== TABLE PER SECTION TYPE ============== --}}
    @if($sectionType === 'single_night')
        @include('pdf.reports._daily-section-single', ['employees' => $sec, 'statusLetter' => $statusLetter, 'statusClass' => $statusClass])
    @elseif($sectionType === 'split')
        @include('pdf.reports._daily-section-split', ['employees' => $sec, 'statusLetter' => $statusLetter, 'statusClass' => $statusClass])
    @elseif($sectionType === 'multi')
        @include('pdf.reports._daily-section-multi', ['employees' => $sec, 'statusLetter' => $statusLetter, 'statusClass' => $statusClass])
    @endif
@endforeach

</body>
</html>
