<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Monthly Attendance Report - Grid</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 6mm 5mm;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 6.5pt;
            color: #1e293b;
            line-height: 1.2;
        }

        /* Header */
        .header {
            display: table;
            width: 100%;
            margin-bottom: 6px;
            border-bottom: 2px solid #0ea5e9;
            padding-bottom: 6px;
        }

        .header-left {
            display: table-cell;
            vertical-align: middle;
            width: 60%;
        }

        .header-right {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
            width: 40%;
        }

        .company-name { font-size: 12pt; font-weight: bold; color: #0f172a; }
        .report-title { font-size: 9pt; font-weight: bold; color: #0ea5e9; }
        .report-meta { font-size: 6pt; color: #64748b; margin-top: 2px; }

        /* Grid Table */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 6pt;
        }

        thead th {
            background: #0f172a;
            color: #fff;
            padding: 3px 2px;
            text-align: center;
            font-weight: 600;
            font-size: 5.5pt;
            white-space: nowrap;
            border: 1px solid #334155;
        }

        thead th.emp-col {
            text-align: left;
            min-width: 80px;
        }

        thead th.date-col {
            width: 18px;
        }

        thead th.summary-col {
            background: #1e3a5f;
            width: 22px;
        }

        tbody td {
            padding: 2px 2px;
            border: 1px solid #e2e8f0;
            text-align: center;
            vertical-align: middle;
            font-size: 5.5pt;
        }

        tbody td.emp-cell {
            text-align: left;
            padding-left: 4px;
            white-space: nowrap;
            overflow: hidden;
            font-size: 6pt;
        }

        tbody tr:nth-child(even) { background: #f8fafc; }

        /* Status Colors in cells */
        .s-P { background: #dcfce7; color: #16a34a; font-weight: bold; }
        .s-A { background: #fee2e2; color: #dc2626; font-weight: bold; }
        .s-LC { background: #fef3c7; color: #d97706; font-weight: bold; }
        .s-EG { background: #fef3c7; color: #d97706; font-weight: bold; }
        .s-L { background: #ede9fe; color: #7c3aed; font-weight: bold; }
        .s-H { background: #e0f2fe; color: #0284c7; font-weight: bold; }
        .s-O { background: #f1f5f9; color: #94a3b8; font-weight: bold; }
        .s-M { background: #fef2f2; color: #ef4444; font-weight: bold; }
        .s-V { background: #e0f2fe; color: #0284c7; font-weight: bold; }
        .s-- { color: #cbd5e1; }

        .summary-cell {
            font-weight: bold;
            font-size: 6pt;
            background: #f8fafc;
        }

        /* Legend */
        .legend {
            margin-top: 8px;
            display: table;
            width: 100%;
        }

        .legend-item {
            display: inline-block;
            margin-right: 10px;
            font-size: 6pt;
        }

        .legend-box {
            display: inline-block;
            width: 10px;
            height: 8px;
            border-radius: 2px;
            vertical-align: middle;
            margin-right: 2px;
        }

        .footer {
            margin-top: 6px;
            text-align: center;
            font-size: 5.5pt;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-left">
            <div class="company-name">{{ $company->name ?? 'Company' }}</div>
            <div class="report-title">Monthly Attendance Grid</div>
            <div class="report-meta">
                @foreach($filters as $key => $value)
                    {{ $key }}: {{ $value }} &nbsp;|&nbsp;
                @endforeach
            </div>
        </div>
        <div class="header-right">
            <div style="font-size: 8pt; font-weight: bold;">
                {{ \Carbon\Carbon::parse($fromDate)->format('d M') }} - {{ \Carbon\Carbon::parse($toDate)->format('d M Y') }}
            </div>
        </div>
    </div>

    <!-- Grid Table -->
    <table>
        <thead>
            <tr>
                <th class="emp-col">#</th>
                <th class="emp-col">Employee</th>
                <th class="emp-col">Dept</th>
                @foreach($dates as $date)
                    <th class="date-col">
                        {{ \Carbon\Carbon::parse($date)->format('d') }}<br>
                        <span style="font-size: 4.5pt; font-weight: normal; opacity: 0.7;">
                            {{ \Carbon\Carbon::parse($date)->format('D')[0] }}
                        </span>
                    </th>
                @endforeach
                <th class="summary-col">P</th>
                <th class="summary-col">A</th>
                <th class="summary-col">L</th>
                <th class="summary-col">H</th>
                <th class="summary-col">O</th>
            </tr>
        </thead>
        <tbody>
            @php $idx = 0; @endphp
            @foreach($grid as $empId => $row)
                @php
                    $emp = $row['employee'];
                    $idx++;
                @endphp
                <tr>
                    <td class="emp-cell">{{ $idx }}</td>
                    <td class="emp-cell" style="font-weight: 600;">
                        {{ $emp->first_name ?? '' }}
                    </td>
                    <td class="emp-cell" style="font-size: 5.5pt; color: #64748b;">
                        {{ $emp->department->name ?? '---' }}
                    </td>
                    @foreach($dates as $date)
                        @php $status = $row['dates'][$date] ?? '-'; @endphp
                        <td class="s-{{ $status }}">
                            {{ $status === '-' ? '' : $status }}
                        </td>
                    @endforeach
                    <td class="summary-cell" style="color: #16a34a;">{{ $row['summary']['present'] }}</td>
                    <td class="summary-cell" style="color: #dc2626;">{{ $row['summary']['A'] }}</td>
                    <td class="summary-cell" style="color: #7c3aed;">{{ $row['summary']['L'] }}</td>
                    <td class="summary-cell" style="color: #0284c7;">{{ $row['summary']['H'] }}</td>
                    <td class="summary-cell" style="color: #64748b;">{{ $row['summary']['O'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Legend -->
    <div class="legend">
        <span class="legend-item"><span class="legend-box" style="background: #dcfce7;"></span>P - Present</span>
        <span class="legend-item"><span class="legend-box" style="background: #fee2e2;"></span>A - Absent</span>
        <span class="legend-item"><span class="legend-box" style="background: #fef3c7;"></span>LC - Late</span>
        <span class="legend-item"><span class="legend-box" style="background: #fef3c7;"></span>EG - Early Out</span>
        <span class="legend-item"><span class="legend-box" style="background: #ede9fe;"></span>L - Leave</span>
        <span class="legend-item"><span class="legend-box" style="background: #e0f2fe;"></span>H - Holiday</span>
        <span class="legend-item"><span class="legend-box" style="background: #f1f5f9;"></span>O - Week Off</span>
        <span class="legend-item"><span class="legend-box" style="background: #fef2f2;"></span>M - Missing</span>
    </div>

    <div class="footer">
        Generated by MyTime2Cloud &bull; {{ \Carbon\Carbon::now()->format('d M Y, h:i A') }}
    </div>
</body>
</html>
