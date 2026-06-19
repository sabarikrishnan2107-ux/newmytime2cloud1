<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Absent Report — {{ $date }}</title>
<style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #222; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .meta { color: #666; font-size: 9px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 600; }
    tr.approved td { background: #f0fdf4; }
    .right { text-align: right; }
</style>
</head>
<body>
    <h1>Absent Report</h1>
    <div class="meta">
        {{ $company['name'] ?? 'Company' }} · {{ $period['date_label'] ?? $date }} ({{ $period['day_name'] ?? '' }})
        @if(!empty($period['branches_label']))· {{ $period['branches_label'] }}@endif
    </div>

    <div class="meta">
        Total employees: {{ $summary['total_employees'] ?? 0 }} · Absent: {{ $summary['absent_count'] ?? 0 }} ({{ $summary['absent_pct'] ?? 0 }}%)
        · Approved: {{ $summary['approved_count'] ?? 0 }} · Unapproved: {{ $summary['unapproved_count'] ?? 0 }}
    </div>

    <table>
        <thead>
            <tr>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Branch</th>
                <th>Shift</th>
                <th>Type</th>
                <th class="right">Streak</th>
                <th>Last Present</th>
            </tr>
        </thead>
        <tbody>
        @forelse ($rows as $row)
            <tr class="{{ ($row['approved'] ?? false) ? 'approved' : '' }}">
                <td>{{ $row['emp_id'] ?? '' }}</td>
                <td>{{ $row['name'] ?? '' }}</td>
                <td>{{ $row['dept'] ?? '' }}</td>
                <td>{{ $row['branch'] ?? '' }}</td>
                <td>{{ $row['shift_name'] ?? '' }} {{ $row['shift_time'] ?? '' }}</td>
                <td>{{ $row['absent_type'] ?? '' }}</td>
                <td class="right">{{ $row['streak'] ?? 0 }}</td>
                <td>{{ $row['last_present'] ?? '' }}</td>
            </tr>
        @empty
            <tr><td colspan="8" style="text-align:center; padding: 12px;">No absent employees on this date.</td></tr>
        @endforelse
        </tbody>
    </table>
</body>
</html>
