<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Daily Attendance Report</title>
    <style>
        @page { size: A4 landscape; margin: 10mm 8mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 8pt; color: #1e293b; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        .header { display: table; width: 100%; margin-bottom: 12px; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
        .header-left { display: table-cell; vertical-align: middle; width: 70%; }
        .header-right { display: table-cell; vertical-align: middle; text-align: right; width: 30%; }
        .company-name { font-size: 16pt; font-weight: bold; color: #0f172a; }
        .report-title { font-size: 11pt; font-weight: bold; color: #4f46e5; margin-top: 2px; }
        .report-meta { font-size: 7.5pt; color: #64748b; margin-top: 4px; }

        .stats-bar { display: table; width: 100%; margin-bottom: 12px; }
        .stat-box { display: table-cell; text-align: center; padding: 6px 8px; border: 1px solid #e2e8f0; }
        .stat-value { font-size: 14pt; font-weight: bold; }
        .stat-label { font-size: 6.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-present .stat-value { color: #16a34a; }
        .stat-absent .stat-value { color: #dc2626; }
        .stat-late .stat-value { color: #f59e0b; }
        .stat-leave .stat-value { color: #8b5cf6; }
        .stat-holiday .stat-value { color: #0ea5e9; }
        .stat-weekoff .stat-value { color: #64748b; }
        .stat-missing .stat-value { color: #f97316; }

        table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
        thead th { background: #1e293b; color: #fff; padding: 6px 5px; text-align: center; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
        thead th:first-child { text-align: left; }
        tbody td { padding: 5px 5px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; text-align: center; }
        tbody td:first-child { text-align: left; }
        tbody tr:nth-child(even) { background: #f8fafc; }

        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 6.5pt; font-weight: bold; text-align: center; }
        .badge-P { background: #dcfce7; color: #16a34a; }
        .badge-A { background: #fee2e2; color: #dc2626; }
        .badge-LC { background: #fef3c7; color: #d97706; }
        .badge-EG { background: #fef3c7; color: #d97706; }
        .badge-L { background: #ede9fe; color: #7c3aed; }
        .badge-H { background: #e0f2fe; color: #0284c7; }
        .badge-O { background: #f1f5f9; color: #64748b; }
        .badge-M { background: #fff7ed; color: #f97316; }

        .shift-type { font-size: 5.5pt; color: #94a3b8; text-transform: uppercase; }
        .manual-tag { font-size: 5.5pt; color: #dc2626; font-weight: bold; display: block; }
        .device-name { font-size: 5.5pt; color: #94a3b8; }
        .text-late { color: #dc2626; font-weight: bold; }
        .text-muted { color: #94a3b8; }

        .footer { margin-top: 12px; text-align: center; font-size: 6.5pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    </style>
</head>
<body>
    @php
        $shiftTypeMap = [1 => 'FILO', 2 => 'Multi', 3 => 'Auto', 4 => 'Night', 5 => 'Split', 6 => 'Single'];
    @endphp

    <div class="header">
        <div class="header-left">
            <div class="company-name">{{ $company->name ?? 'Company' }}</div>
            <div class="report-title">Daily Attendance Report</div>
            <div class="report-meta">
                @foreach($filters as $key => $value)
                    {{ $key }}: {{ $value }} &nbsp;&nbsp;|&nbsp;&nbsp;
                @endforeach
            </div>
        </div>
        <div class="header-right">
            <div style="font-size: 12pt; font-weight: bold; color: #0f172a;">
                {{ \Carbon\Carbon::parse($date)->format('d M Y') }}
            </div>
            <div style="font-size: 7pt; color: #64748b;">
                {{ \Carbon\Carbon::parse($date)->format('l') }}
            </div>
        </div>
    </div>

    <div class="stats-bar">
        <div class="stat-box" style="background: #f0fdf4;"><div class="stat-value stat-present">{{ $stats['present'] }}</div><div class="stat-label">Present</div></div>
        <div class="stat-box" style="background: #fef2f2;"><div class="stat-value stat-absent">{{ $stats['absent'] }}</div><div class="stat-label">Absent</div></div>
        <div class="stat-box" style="background: #fffbeb;"><div class="stat-value stat-late">{{ $stats['late'] }}</div><div class="stat-label">Late</div></div>
        <div class="stat-box" style="background: #faf5ff;"><div class="stat-value stat-leave">{{ $stats['leave'] }}</div><div class="stat-label">Leave</div></div>
        <div class="stat-box" style="background: #f0f9ff;"><div class="stat-value stat-holiday">{{ $stats['holiday'] }}</div><div class="stat-label">Holiday</div></div>
        <div class="stat-box" style="background: #f8fafc;"><div class="stat-value stat-weekoff">{{ $stats['week_off'] }}</div><div class="stat-label">Week Off</div></div>
        <div class="stat-box" style="background: #fff7ed;"><div class="stat-value stat-missing">{{ $stats['missing'] ?? 0 }}</div><div class="stat-label">Missing</div></div>
        <div class="stat-box"><div class="stat-value" style="color: #0f172a;">{{ $stats['total'] }}</div><div class="stat-label">Total</div></div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="text-align:left">#</th>
                <th style="text-align:left">Employee</th>
                <th>ID</th>
                <th>Dept</th>
                <th>Branch</th>
                <th>Shift</th>
                <th>In</th>
                <th>Out</th>
                <th>Late In</th>
                <th>Early Out</th>
                <th>Total Hrs</th>
                <th>OT</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($records as $index => $record)
                @php
                    $isManual = str_contains(strtolower($record->device_id_in ?? ''), 'manual')
                        || str_contains(strtolower($record->device_id_out ?? ''), 'manual');
                    $hasLate = $record->late_coming && $record->late_coming !== '---' && $record->late_coming !== '00:00';
                    $hasEarly = $record->early_going && $record->early_going !== '---' && $record->early_going !== '00:00';
                    $hasHrs = $record->total_hrs && $record->total_hrs !== '---' && $record->total_hrs !== '00:00';
                    $hasOt = $record->ot && $record->ot !== '---' && $record->ot !== '00:00';
                    $stId = $record->shift_type_id ?? '';
                    $stLabel = $shiftTypeMap[$stId] ?? '';

                    $statusLabel = match($record->status) {
                        'P', 'LC', 'EG' => 'PRESENT',
                        'A' => 'ABSENT',
                        'O' => 'WEEKOFF',
                        'H' => 'HOLIDAY',
                        'L' => 'LEAVE',
                        'M' => 'MISSING',
                        default => $record->status,
                    };
                @endphp
                <tr>
                    <td style="text-align:left">{{ $index + 1 }}</td>
                    <td style="text-align:left; font-weight:600;">
                        {{ $record->employee->first_name ?? '' }} {{ $record->employee->last_name ?? '' }}
                    </td>
                    <td>{{ $record->employee->employee_id ?? '---' }}</td>
                    <td>{{ $record->employee->department->name ?? '---' }}</td>
                    <td>{{ $record->employee->branch->branch_name ?? '---' }}</td>
                    <td>
                        {{ $record->shift->name ?? '---' }}
                        @if($stLabel)<br><span class="shift-type">{{ $stLabel }}</span>@endif
                    </td>
                    <td>
                        {{ $record->in ?? '---' }}
                        @if($record->in && $record->in !== '---' && $isManual && str_contains(strtolower($record->device_id_in ?? ''), 'manual'))
                            <span class="manual-tag">Manual</span>
                        @elseif($record->in && $record->in !== '---')
                            <span class="device-name">{{ $record->device_in->name ?? '' }}</span>
                        @endif
                    </td>
                    <td>
                        {{ $record->out ?? '---' }}
                        @if($record->out && $record->out !== '---' && str_contains(strtolower($record->device_id_out ?? ''), 'manual'))
                            <span class="manual-tag">Manual</span>
                        @elseif($record->out && $record->out !== '---')
                            <span class="device-name">{{ $record->device_out->name ?? '' }}</span>
                        @endif
                    </td>
                    <td>{!! $hasLate ? '<span class="text-late">' . $record->late_coming . '</span>' : '---' !!}</td>
                    <td>{{ $hasEarly ? $record->early_going : '---' }}</td>
                    <td style="font-weight:{{ $hasHrs ? '600' : '400' }}">{{ $hasHrs ? $record->total_hrs : '---' }}</td>
                    <td>{{ $hasOt ? $record->ot : '---' }}</td>
                    <td>
                        <span class="badge badge-{{ $record->status }}">{{ $statusLabel }}</span>
                        @if($isManual)<span class="manual-tag">Manual</span>@endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="13" class="text-muted" style="padding: 20px; text-align: center;">
                        No attendance records found for this date.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Generated on {{ \Carbon\Carbon::now()->format('d M Y, h:i A') }} &nbsp;&bull;&nbsp; CONFIDENTIAL &nbsp;&bull;&nbsp; MyTime2Cloud
    </div>
</body>
</html>
