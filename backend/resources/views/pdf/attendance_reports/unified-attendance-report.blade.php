<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
    @page {
        margin: 8mm 6mm;
        size: A4 landscape;
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: DejaVu Sans, sans-serif;
        font-size: 7.5pt;
        margin: 0;
        color: #2c3e50;
    }

    /* ── HEADER ─────────────────────────────────── */
    .header-wrap {
        width: 100%;
        border-bottom: 2px solid #2c3e50;
        padding-bottom: 3mm;
        margin-bottom: 3mm;
    }
    .header-wrap table { width: 100%; border-collapse: collapse; }
    .header-title { font-size: 13pt; font-weight: bold; color: #2c3e50; }
    .header-sub   { font-size: 8pt; color: #7f8c8d; margin-top: 1mm; }
    .header-right { text-align: right; }
    .company-name { font-size: 10pt; font-weight: bold; }
    .company-branch { font-size: 7.5pt; color: #7f8c8d; }

    /* ── EMPLOYEE CARD ──────────────────────────── */
    .emp-card {
        background: #f0f4f8;
        border: 1px solid #c8d6e5;
        border-radius: 3pt;
        padding: 2.5mm 3mm;
        margin-bottom: 2mm;
    }
    .emp-card table { width: 100%; border-collapse: collapse; }
    .emp-name  { font-size: 10pt; font-weight: bold; }
    .emp-meta  { font-size: 7pt; color: #555; margin-top: 0.5mm; }
    .stat-box  { text-align: center; padding: 0 3mm; border-left: 1px solid #c8d6e5; }
    .stat-label { font-size: 6.5pt; color: #7f8c8d; }
    .stat-value { font-size: 9.5pt; font-weight: bold; margin-top: 0.5mm; }

    /* ── STATUS SUMMARY BAR ─────────────────────── */
    .summary-bar {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 2mm;
    }
    .summary-bar td {
        padding: 1.5mm;
        text-align: center;
        font-size: 7pt;
        border: 1px solid #ddd;
    }
    .sum-label { font-size: 6pt; color: #555; }
    .sum-count { font-size: 9.5pt; font-weight: bold; margin-top: 0.5mm; }

    /* ── DAILY TABLE ────────────────────────────── */
    .daily-table {
        width: 100%;
        border-collapse: collapse;
    }
    .daily-table th {
        background: #2c3e50;
        color: #ffffff;
        padding: 2mm 1.5mm;
        font-size: 7pt;
        text-align: left;
        border: 1px solid #2c3e50;
    }
    .daily-table td {
        padding: 1.5mm;
        border: 1px solid #e0e0e0;
        vertical-align: middle;
        font-size: 7pt;
    }
    .daily-table tr.row-even td { background: #fafafa; }

    .date-main { font-weight: bold; font-size: 7.5pt; }
    .date-day  { font-size: 6pt; color: #7f8c8d; }

    .shift-name { font-weight: bold; font-size: 7pt; }
    .shift-type { font-size: 6pt; color: #7f8c8d; margin-top: 0.3mm; }

    /* ── PUNCH CARD ─────────────────────────────── */
    .punch-wrap { white-space: nowrap; }
    .punch-card {
        display: inline-block;
        border: 1px solid #3498db;
        border-radius: 3pt;
        padding: 1.5mm 2mm;
        margin: 0.5mm;
        background: #ebf5fb;
        text-align: center;
        min-width: 44mm;
        vertical-align: top;
    }
    .punch-times {
        font-size: 8pt;
        font-weight: bold;
        color: #1a252f;
    }
    .punch-arrow {
        color: #3498db;
        font-size: 7pt;
    }
    .punch-devices {
        font-size: 5.5pt;
        color: #7f8c8d;
        margin-top: 0.5mm;
    }
    .punch-duration {
        font-size: 6.5pt;
        font-weight: bold;
        color: #27ae60;
        margin-top: 0.5mm;
    }
    .no-punches { font-size: 6.5pt; color: #bbb; font-style: italic; }

    /* ── STATUS BADGE ───────────────────────────── */
    .badge {
        display: inline-block;
        padding: 1mm 2mm;
        border-radius: 3pt;
        font-size: 6.5pt;
        font-weight: bold;
        text-align: center;
    }
    .badge-P  { background: #d4edda; color: #155724; }
    .badge-A  { background: #f8d7da; color: #721c24; }
    .badge-O  { background: #e2e3e5; color: #383d41; }
    .badge-L  { background: #fff3cd; color: #856404; }
    .badge-H  { background: #fef9c3; color: #854d0e; }
    .badge-M  { background: #ffe0b2; color: #e65100; }
    .badge-LC { background: #fde8e8; color: #b91c1c; }
    .badge-EG { background: #fff0e0; color: #c2410c; }

    /* Row colours */
    .row-holiday td { background: #fffde7 !important; }
    .row-off     td { background: #f3f4f6 !important; }
    .row-absent  td { background: #fff5f5 !important; }

    .text-center { text-align: center; }
    .text-right  { text-align: right;  }

    .col-mono { font-family: DejaVu Sans Mono, monospace; font-size: 7pt; }
</style>
</head>
<body>

@php
    $monthName  = date('F', mktime(0, 0, 0, $month, 1, $year));
    $fromDate   = sprintf('%04d-%02d-01', $year, $month);
    $toDate     = date('Y-m-t', strtotime($fromDate));
    $fromLabel  = date('d M Y', strtotime($fromDate));
    $toLabel    = date('d M Y', strtotime($toDate));

    $statusLabels = [
        'P'  => 'PRESENT',
        'A'  => 'ABSENT',
        'O'  => 'WEEK OFF',
        'L'  => 'LEAVE',
        'H'  => 'HOLIDAY',
        'M'  => 'MISSING',
        'LC' => 'LATE IN',
        'EG' => 'EARLY GO',
    ];
@endphp

{{-- ══════════════════════════════════════════════════════
     HEADER
══════════════════════════════════════════════════════ --}}
<div class="header-wrap">
    <table>
        <tr>
            <td style="width:55%; vertical-align:bottom;">
                <div class="header-title">Monthly Attendance Report</div>
                <div class="header-sub">
                    {{ $monthName }} {{ $year }}
                    &nbsp;|&nbsp;
                    {{ $fromLabel }} &ndash; {{ $toLabel }}
                </div>
            </td>
            <td class="header-right" style="vertical-align:bottom;">
                @if (!empty($company->logo_raw))
                    <img src="{{ getcwd() . '/' . $company->logo_raw }}"
                         style="height:28px; vertical-align:middle; margin-right:3mm;">
                @endif
                <div class="company-name">{{ $company->name ?? '' }}</div>
                @if (!empty($employee->branch->name))
                    <div class="company-branch">{{ $employee->branch->name }}</div>
                @endif
            </td>
        </tr>
    </table>
</div>

{{-- ══════════════════════════════════════════════════════
     EMPLOYEE CARD
══════════════════════════════════════════════════════ --}}
<div class="emp-card">
    <table>
        <tr>
            <td style="width:50%; vertical-align:middle;">
                <div class="emp-name">
                    {{ $employee->first_name }} {{ $employee->last_name }}
                    <span style="font-weight:normal; color:#7f8c8d; font-size:7.5pt;">
                        | {{ $employee->employee_id }}
                    </span>
                </div>
                <div class="emp-meta">
                    {{ optional($employee->department)->name ?? '---' }}
                </div>
            </td>
            <td style="text-align:right; vertical-align:middle;">
                <table style="display:inline-table; border-collapse:collapse;">
                    <tr>
                        <td class="stat-box">
                            <div class="stat-label">Total Worked</div>
                            <div class="stat-value">{{ $summary['total_hours'] }}</div>
                        </td>
                        <td class="stat-box">
                            <div class="stat-label">Late In</div>
                            <div class="stat-value" style="color:#e74c3c;">{{ $summary['total_late'] }}</div>
                        </td>
                        <td class="stat-box">
                            <div class="stat-label">Early Out</div>
                            <div class="stat-value" style="color:#e67e22;">{{ $summary['total_early'] }}</div>
                        </td>
                        <td class="stat-box">
                            <div class="stat-label">Overtime</div>
                            <div class="stat-value" style="color:#27ae60;">{{ $summary['total_ot'] }}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</div>

{{-- ══════════════════════════════════════════════════════
     STATUS SUMMARY BAR
══════════════════════════════════════════════════════ --}}
<table class="summary-bar">
    <tr>
        <td style="background:#d4edda;">
            <div class="sum-label" style="color:#155724;">Present</div>
            <div class="sum-count" style="color:#155724;">{{ $summary['total_present'] }}</div>
        </td>
        <td style="background:#f8d7da;">
            <div class="sum-label" style="color:#721c24;">Absent</div>
            <div class="sum-count" style="color:#721c24;">{{ $summary['total_absent'] }}</div>
        </td>
        <td style="background:#e2e3e5;">
            <div class="sum-label" style="color:#383d41;">Week Off</div>
            <div class="sum-count" style="color:#383d41;">{{ $summary['total_off'] }}</div>
        </td>
        <td style="background:#fff3cd;">
            <div class="sum-label" style="color:#856404;">Leave</div>
            <div class="sum-count" style="color:#856404;">{{ $summary['total_leave'] }}</div>
        </td>
        <td style="background:#fef9c3;">
            <div class="sum-label" style="color:#854d0e;">Holiday</div>
            <div class="sum-count" style="color:#854d0e;">{{ $summary['total_holiday'] }}</div>
        </td>
        <td style="background:#ffe0b2;">
            <div class="sum-label" style="color:#e65100;">Missing</div>
            <div class="sum-count" style="color:#e65100;">{{ $summary['total_missing'] }}</div>
        </td>
    </tr>
</table>

{{-- ══════════════════════════════════════════════════════
     DAILY LOGS TABLE
══════════════════════════════════════════════════════ --}}
<table class="daily-table">
    <thead>
        <tr>
            <th style="width:18mm;">DATE</th>
            <th style="width:28mm;">SHIFT DETAILS</th>
            <th>PUNCH RECORDS</th>
            <th style="width:16mm; text-align:center;">OVERTIME</th>
            <th style="width:16mm; text-align:center;">WORK HRS</th>
            <th style="width:20mm; text-align:center;">STATUS</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($records as $i => $record)
            @php
                $status   = $record['status'] ?? 'A';
                $rowClass = match ($status) {
                    'H'     => 'row-holiday',
                    'O'     => 'row-off',
                    'A'     => 'row-absent',
                    default => ($i % 2 === 1 ? 'row-even' : ''),
                };

                $hasPunches = collect($record['sessions'])->filter(fn($s) => $s !== null)->isNotEmpty();
            @endphp
            <tr class="{{ $rowClass }}">

                {{-- DATE ─────────────────────────────── --}}
                <td>
                    <div class="date-main">{{ $record['date'] }}</div>
                    <div class="date-day">{{ $record['day'] }}</div>
                </td>

                {{-- SHIFT DETAILS ────────────────────── --}}
                <td>
                    <div class="shift-name">{{ $record['shift_name'] }}</div>
                    <div class="shift-type">{{ $record['shift_type'] }}</div>
                </td>

                {{-- PUNCH RECORDS ────────────────────── --}}
                <td class="punch-wrap">
                    @if ($hasPunches)
                        @foreach ($record['sessions'] as $session)
                            @if ($session !== null)
                                <div class="punch-card">
                                    <div class="punch-times">
                                        {{ $session['in_time'] ?? '--:--' }}
                                        <span class="punch-arrow"> &#8594; </span>
                                        {{ $session['out_time'] ?? '--:--' }}
                                    </div>
                                    <div class="punch-devices">
                                        {{ mb_strimwidth($session['device_in'] ?? '---', 0, 12, '..') }}
                                        &nbsp;&nbsp;
                                        {{ mb_strimwidth($session['device_out'] ?? '---', 0, 12, '..') }}
                                    </div>
                                    @if ($session['duration'])
                                        <div class="punch-duration">{{ $session['duration'] }}</div>
                                    @endif
                                </div>
                            @endif
                        @endforeach
                    @else
                        <span class="no-punches">No punches recorded</span>
                    @endif
                </td>

                {{-- OVERTIME ─────────────────────────── --}}
                <td class="text-center col-mono">
                    {{ ($record['ot'] && $record['ot'] !== '---') ? $record['ot'] : '---' }}
                </td>

                {{-- WORK HRS ──────────────────────────── --}}
                <td class="text-center col-mono">
                    {{ ($record['total_hrs'] && $record['total_hrs'] !== '---') ? $record['total_hrs'] : '---' }}
                </td>

                {{-- STATUS ───────────────────────────── --}}
                <td class="text-center">
                    <span class="badge badge-{{ $status }}">
                        {{ $statusLabels[$status] ?? $status }}
                    </span>
                </td>

            </tr>
        @endforeach
    </tbody>
</table>

</body>
</html>
