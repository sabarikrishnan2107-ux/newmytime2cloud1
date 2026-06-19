<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Device Report — {{ $date }}</title>
<style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #222; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .meta { color: #666; font-size: 9px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    .right { text-align: right; }
    .stale td { background: #fff7ed; }
</style>
</head>
<body>
    <h1>Device Report</h1>
    <div class="meta">Company {{ $company_id }} · Branch {{ $branch_id }} · {{ $date }}</div>

    <table>
        <thead>
            <tr>
                <th>Device ID</th>
                <th>Device Name</th>
                <th>Branch</th>
                <th>Last Seen</th>
                <th class="right">Events Today</th>
            </tr>
        </thead>
        <tbody>
        @forelse ($rows as $row)
            <tr class="{{ empty($row['last_seen']) ? 'stale' : '' }}">
                <td>{{ $row['device_id'] ?? '' }}</td>
                <td>{{ $row['device_name'] ?? '' }}</td>
                <td>{{ $row['branch_id'] ?? '' }}</td>
                <td>{{ $row['last_seen'] ?? '—' }}</td>
                <td class="right">{{ $row['events_today'] ?? 0 }}</td>
            </tr>
        @empty
            <tr><td colspan="5" style="text-align:center; padding: 12px;">No devices for this company/branch.</td></tr>
        @endforelse
        </tbody>
    </table>
</body>
</html>
