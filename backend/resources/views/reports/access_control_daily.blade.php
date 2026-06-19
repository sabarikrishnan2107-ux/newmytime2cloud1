<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Access Control Report — {{ $date }}</title>
<style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #222; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .meta { color: #666; font-size: 9px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
</style>
</head>
<body>
    <h1>Access Control Report</h1>
    <div class="meta">Company {{ $company_id }} · Branch {{ $branch_id }} · {{ $date }}</div>

    <table>
        <thead>
            <tr>
                <th>Time</th>
                <th>Employee</th>
                <th>Device / Door</th>
                <th>Direction</th>
                <th>Result</th>
            </tr>
        </thead>
        <tbody>
        @forelse ($rows as $row)
            <tr>
                <td>{{ $row['log_time'] ?? $row['created_at'] ?? '' }}</td>
                <td>{{ $row['employee_name'] ?? $row['employee_id'] ?? '' }}</td>
                <td>{{ $row['door_name'] ?? $row['device_id'] ?? '' }}</td>
                <td>{{ $row['direction'] ?? '' }}</td>
                <td>{{ $row['result'] ?? $row['status'] ?? '' }}</td>
            </tr>
        @empty
            <tr><td colspan="5" style="text-align:center; padding: 12px;">No access-control events on this date.</td></tr>
        @endforelse
        </tbody>
    </table>
</body>
</html>
