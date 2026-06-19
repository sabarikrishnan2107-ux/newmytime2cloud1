<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Monthly Attendance Report</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 0 0 65px 0;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 8.5pt;
            color: #334155;
            line-height: 1.4;
            background: #f8fafc;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page-break { page-break-after: always; }

        .report-container {
            background: #fff;
            border-top: 4px solid #4f46e5;
            padding: 24px 28px 16px 28px;
        }

        /* ===== HEADER ===== */
        .header-row {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .header-row td { border: none; padding: 0; vertical-align: middle; }

        .report-title {
            font-size: 18pt;
            font-weight: bold;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .report-meta {
            font-size: 8pt;
            color: #64748b;
            margin-top: 4px;
        }

        .report-meta-icon {
            display: inline-block;
            width: 10px;
            height: 10px;
            border: 1.5px solid #64748b;
            border-radius: 1.5px;
            border-top: 3px solid #64748b;
            vertical-align: middle;
            margin-right: 4px;
        }

        .company-card {
            display: inline-block;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
        }

        .company-card table { border: none; border-collapse: collapse; }
        .company-card td { border: none; padding: 0; vertical-align: middle; }

        .company-icon {
            width: 36px;
            height: 36px;
            background: #4f46e5;
            border-radius: 6px;
            margin-right: 10px;
            text-align: center;
        }

        .company-icon-grid table {
            border-collapse: separate;
            border-spacing: 2px;
            width: 20px;
            margin: 8px auto 0 auto;
        }

        .company-icon-grid td {
            width: 5px; height: 5px;
            background: #fff;
            border-radius: 1px;
            border: none; padding: 0;
        }

        .company-logo {
            width: 36px; height: 36px;
            border-radius: 6px;
            object-fit: contain;
            margin-right: 10px;
        }

        .company-name {
            font-size: 9pt;
            font-weight: bold;
            color: #1e293b;
            text-transform: uppercase;
        }

        .company-branch {
            font-size: 6.5pt;
            color: #64748b;
        }

        /* ===== STATS ROW ===== */
        .stats-row {
            width: 100%;
            border-collapse: separate;
            border-spacing: 10px 0;
            margin-bottom: 18px;
            margin-left: -10px;
        }

        .stats-row td {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 10px;
            vertical-align: middle;
            background: #fff;
        }

        .emp-cell { width: 24%; padding: 12px 14px !important; }

        .emp-table { width: 100%; border: none; border-collapse: collapse; }
        .emp-table td { border: none; padding: 0; vertical-align: middle; }

        .emp-avatar {
            width: 48px; height: 48px;
            border-radius: 8px;
            object-fit: cover;
        }

        .emp-avatar-placeholder {
            width: 48px; height: 48px;
            background: #e2e8f0;
            border-radius: 8px;
            text-align: center;
            overflow: hidden;
        }

        .avatar-head {
            width: 14px; height: 14px;
            background: #94a3b8;
            border-radius: 7px;
            margin: 9px auto 0 auto;
        }

        .avatar-body {
            width: 24px; height: 14px;
            background: #94a3b8;
            border-radius: 12px 12px 0 0;
            margin: 2px auto 0 auto;
        }

        .emp-name {
            font-size: 9pt;
            font-weight: bold;
            color: #1e293b;
            text-transform: uppercase;
        }

        .emp-id {
            font-size: 7pt;
            font-weight: bold;
            color: #4f46e5;
        }

        .emp-dept {
            font-size: 6pt;
            color: #94a3b8;
        }

        .stat-cell { text-align: center; }
        .stat-label {
            font-size: 5.5pt;
            font-weight: bold;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stat-value {
            font-size: 18pt;
            font-weight: bold;
            color: #1e293b;
        }

        .stat-unit { font-size: 7pt; color: #94a3b8; }

        .stat-ot .stat-label { color: #4f46e5; }
        .stat-ot .stat-value { color: #312e81; }

        .stat-lost .stat-label { color: #e11d48; }
        .stat-lost .stat-value { color: #e11d48; }

        /* ===== SUMMARY TILES ===== */
        .summary-row {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px 0;
            margin-bottom: 20px;
            margin-left: -8px;
        }

        .summary-row td {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px 8px;
            background: #fff;
            vertical-align: middle;
        }

        .sum-inner {
            width: 100%;
            border: none;
            border-collapse: collapse;
        }

        .sum-inner td {
            border: none;
            padding: 0;
            vertical-align: middle;
            background: none;
        }

        .sum-label {
            font-size: 6.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            text-align: left;
        }

        .sum-value { font-size: 14pt; font-weight: bold; color: #1e293b; text-align: right; }

        .lbl-present { color: #10b981; }
        .lbl-absent { color: #ef4444; }
        .lbl-weekoff { color: #94a3b8; }
        .lbl-leave { color: #f59e0b; }
        .lbl-holiday { color: #a78bfa; }
        .lbl-missing { color: #c2410c; }
        .lbl-manual { color: #94a3b8; }

        /* ===== DATA TABLE ===== */
        .data-table {
            width: 100%;
            border-collapse: collapse;
        }

        .data-table thead th {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
            padding: 10px 12px;
            font-weight: 700;
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .data-table thead th:first-child { text-align: left; }
        .data-table thead th:last-child { text-align: right; }
        .data-table thead th { text-align: center; }

        .data-table tbody td {
            padding: 12px 12px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
            text-align: center;
            font-size: 8pt;
        }

        .data-table tbody td:first-child { text-align: left; }
        .data-table tbody td:last-child { text-align: right; }

        .td-date { font-weight: bold; color: #1e293b; font-size: 9pt; }
        .td-day { font-size: 6pt; color: #94a3b8; }
        .td-shift { font-weight: bold; color: #475569; font-size: 7.5pt; }
        .td-shift-type { font-size: 5.5pt; color: #64748b; text-transform: uppercase; }
        .td-time { font-weight: bold; color: #1e293b; font-size: 8.5pt; }
        .td-device { font-size: 5pt; color: #475569; text-transform: uppercase; }
        .td-dash { color: #cbd5e1; font-size: 8.5pt; }
        .td-late { color: #e11d48; font-weight: bold; }
        .td-early { color: #d97706; font-weight: bold; }
        .td-ot { color: #4f46e5; font-weight: bold; }
        .td-hrs { color: #475569; font-weight: 600; }
        .td-zero { color: #cbd5e1; }

        /* Status text */
        .st-present { font-weight: bold; font-size: 7pt; color: #059669; }
        .st-absent { font-weight: bold; font-size: 7pt; color: #ef4444; }
        .st-weekoff { font-weight: bold; font-size: 7pt; color: #94a3b8; }
        .st-holiday { font-weight: bold; font-size: 7pt; color: #8b5cf6; }
        .st-leave { font-weight: bold; font-size: 7pt; color: #7c3aed; }
        .st-missing { font-weight: bold; font-size: 7pt; color: #f97316; }
        .st-missing { font-weight: bold; color: #f97316; }
        .st-manual { font-size: 6pt; color: #dc2626; font-weight: bold; display: block; margin-top: 1px; }

        /* Row highlights */
        .row-absent td { background: #fff5f5 !important; }
        .row-weekoff td { background: #f1f5f9 !important; }
        .row-weekoff .td-day { color: #6366f1; font-weight: bold; }
        .row-holiday td { background: #faf5ff !important; }

        /* Multi-shift */
        .td-session { font-family: Helvetica, Arial, sans-serif; font-size: 8pt; font-weight: bold; color: #1e293b; }
        .td-session-device { font-family: Helvetica, Arial, sans-serif; font-size: 5pt; color: #475569; }
        .td-session-empty { color: #d1d5db; font-size: 8pt; }

        /* Split shift labels */
        .split-label {
            display: inline-block;
            font-size: 5.5pt;
            font-weight: bold;
            color: #fff;
            background: #4f46e5;
            padding: 1px 5px;
            border-radius: 2px;
            text-transform: uppercase;
            margin-right: 4px;
        }

        .split-label-aftn { background: #7c3aed; }
        .split-time { font-size: 7pt; color: #475569; font-weight: 500; }

        .split-row td { border-bottom: none !important; padding-bottom: 3px !important; }
        .split-row-sub td { border-top: none !important; padding-top: 3px !important; }

        .row-message { font-size: 7.5pt; font-style: italic; color: #94a3b8; }
        .row-message-holiday { font-size: 7.5pt; font-weight: bold; color: #4f46e5; text-transform: uppercase; }
        .row-message-absent { font-size: 7.5pt; font-style: italic; color: #e11d48; }

    </style>
</head>
<body>
    @foreach($employees as $empId => $empData)
        @php
            $emp = $empData['employee'];
            $days = $empData['days'];
            $st = $empData['stats'];

            $totalDays = count($days);
            $score = $totalDays > 0 ? round(($st['present'] / $totalDays) * 100, 0) : 0;
            $totalHrs = floor($st['total_hours'] / 60);
            $totalOtFormatted = floor($st['total_ot'] / 60) . ':' . str_pad($st['total_ot'] % 60, 2, '0', STR_PAD_LEFT);
            $totalLate = $st['total_late'] ?? 0;
            $totalLateFormatted = floor($totalLate / 60) . ':' . str_pad($totalLate % 60, 2, '0', STR_PAD_LEFT);
        @endphp

        <div class="report-container">
            {{-- HEADER --}}
            <table class="header-row">
                <tr>
                    <td style="width: 65%;">
                        @php $isDaily = ($reportMode ?? 'monthly') === 'daily'; @endphp
                        <div class="report-title">{{ $isDaily ? 'Daily' : 'Monthly' }} Attendance Report{{ $isSplitShift ? ' - Split Duty' : ($isMultiShift ? ' - Multi Shift' : '') }}</div>
                        <div class="report-meta">
                            <span class="report-meta-icon"></span>
                            @if($isDaily)
                                {{ \Carbon\Carbon::parse($fromDate)->format('d M Y') }} &nbsp;&bull;&nbsp; {{ \Carbon\Carbon::parse($fromDate)->format('l') }}
                            @else
                                {{ \Carbon\Carbon::parse($fromDate)->format('d M Y') }} - {{ \Carbon\Carbon::parse($toDate)->format('d M Y') }}
                            @endif
                            &nbsp;&bull;&nbsp; {{ $isDaily ? 'Daily Report' : ($isMultiShift ? 'Multi Shift' : ($isSplitShift ? 'Split Duty' : 'Monthly Exact')) }}
                        </div>
                    </td>
                    <td style="text-align: right;">
                        <div class="company-card">
                            <table>
                                <tr>
                                    <td>
                                        @php
                                            $logoRaw = $company->getRawOriginal('logo');
                                            $logoPath = $logoRaw ? public_path('upload/' . $logoRaw) : null;
                                        @endphp
                                        @if($logoPath && file_exists($logoPath))
                                            <img src="{{ $logoPath }}" class="company-logo" />
                                        @else
                                            <div class="company-icon">
                                                <div class="company-icon-grid">
                                                    <table><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></table>
                                                </div>
                                            </div>
                                        @endif
                                    </td>
                                    <td>
                                        <div class="company-name">{{ $company->name ?? 'Company' }}</div>
                                        <div class="company-branch">{{ $emp->branch->branch_name ?? 'Head Office' }}</div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </td>
                </tr>
            </table>

            {{-- STATS ROW --}}
            <table class="stats-row">
                <tr>
                    <td class="emp-cell">
                        <table class="emp-table">
                            <tr>
                                <td style="width: 54px; padding-right: 10px;">
                                    @if($emp->profile_picture)
                                        <img src="{{ $emp->profile_picture }}" class="emp-avatar" />
                                    @else
                                        <div class="emp-avatar-placeholder">
                                            <div class="avatar-head"></div>
                                            <div class="avatar-body"></div>
                                        </div>
                                    @endif
                                </td>
                                <td>
                                    <div class="emp-name">{{ $emp->first_name ?? '' }} {{ $emp->last_name ?? '' }}</div>
                                    <div class="emp-id">ID: {{ $emp->employee_id ?? '---' }}</div>
                                    <div class="emp-dept">{{ $emp->department->name ?? '---' }}</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="stat-cell">
                        <div class="stat-label">Score</div>
                        <div class="stat-value">{{ $score }}%</div>
                    </td>
                    <td class="stat-cell">
                        <div class="stat-label">Worked Hours</div>
                        <div class="stat-value">{{ $totalHrs }} <span class="stat-unit">h</span></div>
                    </td>
                    @if($isSplitShift)
                        <td class="stat-cell stat-lost">
                            <div class="stat-label">Lost Hours</div>
                            <div class="stat-value">{{ $totalLateFormatted }}</div>
                        </td>
                    @endif
                    <td class="stat-cell stat-ot">
                        <div class="stat-label">Overtime</div>
                        <div class="stat-value">{{ $totalOtFormatted }}</div>
                    </td>
                </tr>
            </table>

            {{-- SUMMARY TILES --}}
            <table class="summary-row">
                <tr>
                    <td><table class="sum-inner"><tr><td class="sum-label lbl-present">Present</td><td class="sum-value">{{ str_pad($st['present'], 2, '0', STR_PAD_LEFT) }}</td></tr></table></td>
                    <td><table class="sum-inner"><tr><td class="sum-label lbl-absent">Absent</td><td class="sum-value">{{ str_pad($st['absent'], 2, '0', STR_PAD_LEFT) }}</td></tr></table></td>
                    <td><table class="sum-inner"><tr><td class="sum-label lbl-weekoff">Weekoff</td><td class="sum-value">{{ str_pad($st['week_off'], 2, '0', STR_PAD_LEFT) }}</td></tr></table></td>
                    <td><table class="sum-inner"><tr><td class="sum-label lbl-leave">Leave</td><td class="sum-value">{{ str_pad($st['leave'], 2, '0', STR_PAD_LEFT) }}</td></tr></table></td>
                    <td><table class="sum-inner"><tr><td class="sum-label lbl-holiday">Holiday</td><td class="sum-value">{{ str_pad($st['holiday'], 2, '0', STR_PAD_LEFT) }}</td></tr></table></td>
                    <td><table class="sum-inner"><tr><td class="sum-label lbl-missing">Missing</td><td class="sum-value">{{ str_pad($st['missing'], 2, '0', STR_PAD_LEFT) }}</td></tr></table></td>
                    <td><table class="sum-inner"><tr><td class="sum-label lbl-manual">Manual</td><td class="sum-value">{{ str_pad($st['manual'], 2, '0', STR_PAD_LEFT) }}</td></tr></table></td>
                </tr>
            </table>

            {{-- DATA TABLE --}}
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="text-align: left; width: 90px;">Date</th>
                        @if($isMultiShift)
                            @for($i = 1; $i <= 5; $i++)
                                <th>IN/OUT{{ $i }}</th>
                            @endfor
                            <th>OT</th>
                            <th>Total</th>
                        @elseif($isSplitShift)
                            <th style="text-align: left;">Shift Details</th>
                            <th>In Time</th>
                            <th>Out Time</th>
                            <th style="color: #e11d48;">Late In</th>
                            <th style="color: #d97706;">Early Go</th>
                            <th>Lost Hrs</th>
                            <th style="color: #4f46e5;">Overtime</th>
                            <th>Work Hrs</th>
                        @else
                            <th style="text-align: left;">Shift Details</th>
                            <th>In Time</th>
                            <th>Out Time</th>
                            <th>Late In</th>
                            <th>Early Go</th>
                            <th>Overtime</th>
                            <th>Work Hrs</th>
                        @endif
                        <th style="text-align: right;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($days as $day)
                        @php

                            $rowClass = '';
                            if ($day['status'] === 'H') $rowClass = 'row-holiday';
                            elseif ($day['status'] === 'O') $rowClass = 'row-weekoff';
                            elseif ($day['status'] === 'A') $rowClass = 'row-absent';

                            $stClass = match($day['status']) {
                                'P', 'LC', 'EG' => 'st-present',
                                'A' => 'st-absent',
                                'O' => 'st-weekoff',
                                'H' => 'st-holiday',
                                'L' => 'st-leave',
                                'M' => 'st-missing',
                                default => 'st-weekoff',
                            };

                            $stText = match($day['status']) {
                                'P' => 'PRESENT', 'A' => 'ABSENT', 'O' => 'WEEKOFF',
                                'H' => 'HOLIDAY', 'L' => 'LEAVE', 'M' => 'MISSING',
                                'LC' => 'PRESENT', 'EG' => 'PRESENT', 'V' => 'VACATION',
                                default => $day['status'],
                            };

                            $hasLate = $day['late_coming'] !== '---' && $day['late_coming'] !== '00:00';
                            $hasEarly = $day['early_going'] !== '---' && $day['early_going'] !== '00:00';
                            $hasOt = $day['ot'] !== '---' && $day['ot'] !== '00:00';
                            $hasHrs = $day['total_hrs'] !== '---' && $day['total_hrs'] !== '00:00';
                        @endphp


                        @if($isMultiShift)
                            <tr class="{{ $rowClass }}">
                                <td style="text-align: left;">
                                    <div class="td-date">{{ \Carbon\Carbon::parse($day['date'])->format('d M') }}</div>
                                    <div class="td-day">{{ $day['day'] }}</div>
                                </td>
                                @if($day['status'] === 'A')
                                    @for($i = 0; $i < 5; $i++)
                                        <td><span class="td-session-empty">&ndash;</span></td>
                                    @endfor
                                    <td class="td-zero">00:00</td>
                                    <td class="td-zero">00:00</td>
                                @elseif(in_array($day['status'], ['O', 'H', 'L']))
                                    <td colspan="5" style="text-align: center;">
                                        @if($day['status'] === 'O')<span class="row-message">Weekoff</span>
                                        @elseif($day['status'] === 'H')<span class="row-message-holiday">Public Holiday</span>
                                        @elseif($day['status'] === 'L')<span class="row-message">On Leave</span>
                                        @endif
                                    </td>
                                    <td class="td-zero">00:00</td>
                                    <td class="td-zero">00:00</td>
                                @else
                                    @for($i = 0; $i < 5; $i++)
                                        @php
                                            $logIn = $day['logs'][$i]['in'] ?? '---';
                                            $logOut = $day['logs'][$i]['out'] ?? '---';
                                            $devIn = $day['logs'][$i]['device_in'] ?? '';
                                            $devOut = $day['logs'][$i]['device_out'] ?? '';
                                            $hasSes = ($logIn !== '---' && $logIn !== '') || ($logOut !== '---' && $logOut !== '');
                                        @endphp
                                        <td>
                                            @if($hasSes)
                                                <div class="td-session">{{ $logIn !== '---' ? $logIn : '--' }} - {{ $logOut !== '---' ? $logOut : '--' }}</div>
                                                @if($devIn || $devOut)<div class="td-session-device">{{ $devIn ?: '--' }} / {{ $devOut ?: '--' }}</div>@endif
                                            @else
                                                <span class="td-session-empty">&ndash;</span>
                                            @endif
                                        </td>
                                    @endfor
                                    <td class="{{ $hasOt ? 'td-ot' : 'td-zero' }}">{{ $hasOt ? $day['ot'] : '00:00' }}</td>
                                    <td class="{{ $hasHrs ? 'td-hrs' : 'td-zero' }}">{{ $hasHrs ? $day['total_hrs'] : '00:00' }}</td>
                                @endif
                                <td style="text-align: right;">
                                    <span class="{{ $stClass }}">{{ $stText }}</span>
                                    @if($day['is_manual'] ?? false)<span class="st-manual">MANUAL</span>@endif
                                </td>
                            </tr>

                        @elseif($isSplitShift)
                            @php
                                $logs = $day['logs'] ?? [];
                                $isNonWork = in_array($day['status'], ['O', 'H', 'A', 'L']);
                            @endphp
                            @if($isNonWork)
                                <tr class="{{ $rowClass }}">
                                    <td style="text-align: left;">
                                        <div class="td-date">{{ \Carbon\Carbon::parse($day['date'])->format('d M') }}</div>
                                        <div class="td-day">{{ $day['day'] }}</div>
                                    </td>
                                    <td style="text-align: left;">
                                        <div class="td-shift">{{ $day['shift'] }}</div>
                                        <div class="td-shift-type">{{ $day['shift_type'] ?? '' }}</div>
                                    </td>
                                    @if($day['status'] === 'A')
                                        <td><span class="td-dash">-- : --</span></td>
                                        <td><span class="td-dash">-- : --</span></td>
                                        <td class="td-zero">-</td>
                                        <td class="td-zero">-</td>
                                        <td class="td-zero">-</td>
                                        <td class="td-zero">-</td>
                                        <td class="td-zero">00:00</td>
                                    @else
                                        <td colspan="4" style="vertical-align: middle;">
                                            @if($day['status'] === 'O')<span class="row-message">Weekoff</span>
                                            @elseif($day['status'] === 'H')<span class="row-message-holiday">Public Holiday</span>
                                            @elseif($day['status'] === 'L')<span class="row-message">On Leave</span>@endif
                                        </td>
                                        <td class="td-zero">-</td><td class="td-zero">-</td><td class="td-zero">00:00</td>
                                    @endif
                                    <td style="text-align: right;">
                                        <span class="{{ $stClass }}">{{ $stText }}</span>
                                        @if($day['is_manual'] ?? false)<span class="st-manual">MANUAL</span>@endif
                                    </td>
                                </tr>
                            @else
                                @php
                                    $s1 = $logs[0] ?? []; $s2 = $logs[1] ?? [];
                                    $s1In = $s1['in'] ?? '---'; $s1Out = $s1['out'] ?? '---';
                                    $s1DevIn = $s1['device_in'] ?? ''; $s1DevOut = $s1['device_out'] ?? '';
                                    $s1HasIn = $s1In !== '---' && $s1In !== ''; $s1HasOut = $s1Out !== '---' && $s1Out !== '';
                                    $s2In = $s2['in'] ?? '---'; $s2Out = $s2['out'] ?? '---';
                                    $s2DevIn = $s2['device_in'] ?? ''; $s2DevOut = $s2['device_out'] ?? '';
                                    $s2HasIn = $s2In !== '---' && $s2In !== ''; $s2HasOut = $s2Out !== '---' && $s2Out !== '';
                                    $s1Late = $s1['late_coming'] ?? '---'; $s1Early = $s1['early_going'] ?? '---';
                                    $s2Late = $s2['late_coming'] ?? '---'; $s2Early = $s2['early_going'] ?? '---';
                                    $s1HasLate = $s1Late !== '---' && $s1Late !== '00:00' && $s1Late !== '';
                                    $s1HasEarly = $s1Early !== '---' && $s1Early !== '00:00' && $s1Early !== '';
                                    $s2HasLate = $s2Late !== '---' && $s2Late !== '00:00' && $s2Late !== '';
                                    $s2HasEarly = $s2Early !== '---' && $s2Early !== '00:00' && $s2Early !== '';
                                @endphp
                                <tr class="{{ $rowClass }}">
                                    <td style="text-align: left;">
                                        <div class="td-date">{{ \Carbon\Carbon::parse($day['date'])->format('d M') }}</div>
                                        <div class="td-day">{{ $day['day'] }}</div>
                                    </td>
                                    <td style="text-align: left;">
                                        <div class="td-shift">{{ $day['shift'] }}</div>
                                        <div class="td-shift-type">{{ $day['shift_type'] ?? '' }}</div>
                                    </td>
                                    <td>
                                        @if($s1HasIn)<div class="td-time">{{ $s1In }}</div>@if($s1DevIn)<div class="td-device">{{ $s1DevIn }}</div>@endif @else<span class="td-dash">-- : --</span>@endif
                                        @if($s2HasIn)<div class="td-time" style="margin-top: 4px;">{{ $s2In }}</div>@if($s2DevIn)<div class="td-device">{{ $s2DevIn }}</div>@endif @else<div style="margin-top: 4px;"><span class="td-dash">-- : --</span></div>@endif
                                    </td>
                                    <td>
                                        @if($s1HasOut)<div class="td-time">{{ $s1Out }}</div>@if($s1DevOut)<div class="td-device">{{ $s1DevOut }}</div>@endif @else<span class="td-dash">-- : --</span>@endif
                                        @if($s2HasOut)<div class="td-time" style="margin-top: 4px;">{{ $s2Out }}</div>@if($s2DevOut)<div class="td-device">{{ $s2DevOut }}</div>@endif @else<div style="margin-top: 4px;"><span class="td-dash">-- : --</span></div>@endif
                                    </td>
                                    <td class="{{ $s1HasLate || $s2HasLate ? 'td-late' : 'td-zero' }}">
                                        <div>{{ $s1HasLate ? $s1Late : '-' }}</div>
                                        <div style="margin-top: 4px;">{{ $s2HasLate ? $s2Late : '-' }}</div>
                                    </td>
                                    <td class="{{ $s1HasEarly || $s2HasEarly ? 'td-early' : 'td-zero' }}">
                                        <div>{{ $s1HasEarly ? $s1Early : '-' }}</div>
                                        <div style="margin-top: 4px;">{{ $s2HasEarly ? $s2Early : '-' }}</div>
                                    </td>
                                    <td>{{ $hasLate ? $day['late_coming'] : '-' }}</td>
                                    <td class="{{ $hasOt ? 'td-ot' : 'td-zero' }}">{{ $hasOt ? $day['ot'] : '-' }}</td>
                                    <td class="{{ $hasHrs ? 'td-hrs' : 'td-zero' }}">{{ $hasHrs ? $day['total_hrs'] : '00:00' }}</td>
                                    <td style="text-align: right;">
                                        <span class="{{ $stClass }}">{{ $stText }}</span>
                                        @if($day['is_manual'] ?? false)<span class="st-manual">MANUAL</span>@endif
                                    </td>
                                </tr>
                            @endif

                        @else
                            {{-- SINGLE SHIFT --}}
                            <tr class="{{ $rowClass }}">
                                <td style="text-align: left;">
                                    <div class="td-date">{{ $day['date'] }}</div>
                                    <div class="td-day">{{ $day['day'] }}</div>
                                </td>
                                <td style="text-align: left;">
                                    <div class="td-shift">{{ $day['shift'] }}</div>
                                    <div class="td-shift-type">{{ $day['shift_type'] ?? '' }}</div>
                                </td>
                                <td>
                                    @if($day['in'] !== '---')
                                        <div class="td-time">{{ $day['in'] }}</div>
                                        <div class="td-device">{{ $day['device_in'] ?: '' }}</div>
                                    @else<span class="td-dash">-- : --</span>@endif
                                </td>
                                <td>
                                    @if($day['out'] !== '---')
                                        <div class="td-time">{{ $day['out'] }}</div>
                                        <div class="td-device">{{ $day['device_out'] ?: '' }}</div>
                                    @else<span class="td-dash">-- : --</span>@endif
                                </td>
                                <td class="{{ $hasLate ? 'td-late' : 'td-zero' }}">{{ $hasLate ? $day['late_coming'] : '-' }}</td>
                                <td class="{{ $hasEarly ? 'td-early' : 'td-zero' }}">{{ $hasEarly ? $day['early_going'] : '-' }}</td>
                                <td class="{{ $hasOt ? 'td-ot' : 'td-zero' }}">{{ $hasOt ? $day['ot'] : '-' }}</td>
                                <td class="{{ $hasHrs ? 'td-hrs' : 'td-zero' }}">{{ $hasHrs ? $day['total_hrs'] : '--:--' }}</td>
                                <td style="text-align: right;">
                                    <span class="{{ $stClass }}">{{ $stText }}</span>
                                    @if($day['is_manual'] ?? false)<span class="st-manual">MANUAL</span>@endif
                                </td>
                            </tr>
                        @endif
                    @endforeach
                </tbody>
            </table>
        </div>

        @if(!$loop->last)
            <div class="page-break"></div>
        @endif
    @endforeach
</body>
</html>
