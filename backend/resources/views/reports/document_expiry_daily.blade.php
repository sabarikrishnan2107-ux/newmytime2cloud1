<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Document Expiry Report — {{ $date }}</title>
<style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #222; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .meta { color: #666; font-size: 9px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    .right { text-align: right; }
    .urgent td { background: #fef2f2; }
</style>
</head>
<body>
    <h1>Document Expiry Report</h1>
    <div class="meta">Company {{ $company_id }} · Branch {{ $branch_id }} · Reference {{ $date }} · Threshold {{ $threshold ?? 30 }} days</div>

    <table>
        <thead>
            <tr>
                <th>Employee</th>
                <th>Document Type</th>
                <th>Document #</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th class="right">Days Left</th>
            </tr>
        </thead>
        <tbody>
        @forelse ($rows as $row)
            @php $daysLeft = (int) ($row['days_left'] ?? 0); @endphp
            <tr class="{{ $daysLeft <= 7 ? 'urgent' : '' }}">
                <td>{{ $row['employee_name'] ?? '' }}</td>
                <td>{{ $row['document_type'] ?? '' }}</td>
                <td>{{ $row['document_number'] ?? '' }}</td>
                <td>{{ $row['issue_date'] ?? '' }}</td>
                <td>{{ $row['expiry_date'] ?? '' }}</td>
                <td class="right">{{ $daysLeft }}</td>
            </tr>
        @empty
            <tr><td colspan="6" style="text-align:center; padding: 12px;">No documents expiring within the threshold.</td></tr>
        @endforelse
        </tbody>
    </table>
</body>
</html>
