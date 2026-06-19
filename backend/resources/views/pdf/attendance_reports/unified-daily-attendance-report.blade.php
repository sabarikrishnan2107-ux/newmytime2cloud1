<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
    @page {
        margin: 8mm 6mm;
        size: A4 landscape;
    }

    * { box-sizing: border-box; }

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

    /* ── SUMMARY BAR ─────────────────────────────── */
    .summary-bar { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
    .summary-bar td {
        padding: 1.5mm;
        text-align: center;
        font-size: 7pt;
        border: 1px solid #ddd;
    }
    .sum-label { font-size: 6pt; }
    .sum-count { font-size: 9.5pt; font-weight: bold; margin-top: 0.5mm; }

    /* ── MAIN TABLE ──────────────────────────────── */
    .main-table { width: 100%; border-collapse: collapse; }
    .main-table th {
        background: #2c3e50;
        color: #fff;
        padding: 2mm 1.5mm;
        font-size: 7pt;
        text-align: left;
        border: 1px solid #2c3e50;
    }
    .main-table td {
        padding: 1.5mm;
        border: 1px solid #e0e0e0;
        vertical-align: middle;
        font-size: 7pt;
    }
    .main-table tr.row-even td { background: #fafafa; }

    /* ── EMPLOYEE INFO ───────────────────────────── */
    .emp-name  { font-weight: bold; font-size: 7.5pt; }
    .emp-id    { font-size: 6pt; color: #7f8c8d; }
    .emp-dept  { font-size: 6pt; color: #555; margin-top: 0.3mm; }

    /* ── SHIFT INFO ──────────────────────────────── */
    .shift-name { font-weight: bold; font-size: 7pt; }
    .shift-type { font-size: 6pt; color: #7f8c8d; margin-top: 0.3mm; }

    /* ── PUNCH CARD ──────────────────────────────── */
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
    .punch-arrow { color: #3498db; font-size: 7pt; }
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

    /* Row colour overrides */
    .row-holiday td { background: #fffde7 !important; }
    .row-off     td { background: #f3f4f6 !important; }
    .row-absent  td { background: #fff5f5 !important; }

    .text-center { text-align: center; }
    .col-mono    { font-family: DejaVu Sans Mono, monospace; font-size: 7pt; }
</style>
</head>
<body>

@php
    $dateLabel = date('d M Y', strtotime($date));
    $dayName   = date('l', strtotime($date));

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
                <div class="header-title">Daily Attendance Report</div>
                <div class="header-sub">
                    {{ $dayName }}, {{ $dateLabel }}
                </div>
            </td>
            <td style="text-align:right; vertical-align:bottom;">
                @if (!empty($company->logo_raw))
                    <img src="{{ getcwd() . '/' . $company->logo_raw }}"
                         style="height:28px; vertical-align:middle; margin-right:3mm;">
                @endif
                <div style="font-size:10pt; font-weight:bold;">{{ $company->name ?? '' }}</div>
            </td>
        </tr>
    </table>
</div>

{{-- ══════════════════════════════════════════════════════
     SUMMARY BAR
══════════════════════════════════════════════════════ --}}
<table class="summary-bar">
    <tr>
        <td style="background:#e8f4fd;">
            <div class="sum-label" style="color:#1a6fa8;">Total</div>
            <div class="sum-count" style="color:#1a6fa8;">{{ $summary['total_employees'] }}</div>
        </td>
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
     DAILY TABLE
══════════════════════════════════════════════════════ --}}
<table class="main-table">
    <thead>
        <tr>
            <th style="width:6mm; text-align:center;">#</th>
            <th style="width:40mm;">EMPLOYEE</th>
            <th style="width:28mm;">SHIFT</th>
            <th>PUNCH RECORDS</th>
            <th style="width:16mm; text-align:center;">WORK HRS</th>
            <th style="width:16mm; text-align:center;">OVERTIME</th>
            <th style="width:20mm; text-align:center;">STATUS</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($rows as $i => $row)
            @php
                $employee = $row['employee'];
                $record   = $row['record'];
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

                {{-- # ─────────────────────────────────── --}}
                <td class="text-center" style="color:#aaa;">{{ $i + 1 }}</td>

                {{-- EMPLOYEE ───────────────────────────── --}}
                <td>
                    <div class="emp-name">{{ $employee->first_name }} {{ $employee->last_name }}</div>
                    <div class="emp-id">{{ $employee->employee_id }}</div>
                    <div class="emp-dept">{{ optional($employee->department)->name ?? '---' }}</div>
                </td>

                {{-- SHIFT ───────────────────────────────── --}}
                <td>
                    <div class="shift-name">{{ $record['shift_name'] }}</div>
                    <div class="shift-type">{{ $record['shift_type'] }}</div>
                </td>

                {{-- PUNCH RECORDS ────────────────────────── --}}
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

                {{-- WORK HRS ─────────────────────────────── --}}
                <td class="text-center col-mono">
                    {{ ($record['total_hrs'] && $record['total_hrs'] !== '---') ? $record['total_hrs'] : '---' }}
                </td>

                {{-- OVERTIME ─────────────────────────────── --}}
                <td class="text-center col-mono">
                    {{ ($record['ot'] && $record['ot'] !== '---') ? $record['ot'] : '---' }}
                </td>

                {{-- STATUS ──────────────────────────────── --}}
                <td class="text-center">
                    <span class="badge badge-{{ $status }}">
                        {{ $statusLabels[$status] ?? $status }}
                    </span>
                </td>

            </tr>
        @empty
            <tr>
                <td colspan="7" class="text-center" style="padding: 5mm; color: #aaa;">
                    No attendance records found for this date.
                </td>
            </tr>
        @endforelse
    </tbody>
</table>

</body>
</html>
