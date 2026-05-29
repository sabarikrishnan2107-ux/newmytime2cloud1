<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Activity Logs</title>
    <style>
        @page { margin: 28px 22px 36px 22px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1f2937; }
        .header { display: table; width: 100%; border-bottom: 1px solid #d1d5db; padding-bottom: 8px; margin-bottom: 10px; }
        .header .company { display: table-cell; vertical-align: middle; font-size: 14px; font-weight: bold; }
        .header .generated { display: table-cell; vertical-align: middle; text-align: right; font-size: 9px; color: #6b7280; }
        h1 { font-size: 15px; margin: 4px 0 6px 0; }
        .filter-summary { font-size: 9.5px; color: #374151; margin-bottom: 10px; line-height: 1.5; }
        .filter-summary span { display: inline-block; margin-right: 14px; }
        .filter-summary strong { color: #111827; }
        table { width: 100%; border-collapse: collapse; }
        thead th { background: #1f2937; color: #f9fafb; font-size: 9.5px; text-align: left; padding: 6px 6px; }
        tbody td { font-size: 9.5px; padding: 5px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        tbody tr:nth-child(even) td { background: #f9fafb; }
        .empty { padding: 18px; text-align: center; color: #6b7280; font-style: italic; }
        .footer { position: fixed; bottom: -22px; left: 0; right: 0; font-size: 8px; color: #9ca3af; text-align: center; }
        .pagenum:before { content: counter(page); }
    </style>
</head>
<body>
    <div class="header">
        <div class="company">{{ $company->name ?? 'Activity Logs' }}</div>
        <div class="generated">Generated {{ $generatedAt->format('d M Y H:i') }}</div>
    </div>

    <h1>Activity Logs</h1>

    @if(!empty($filterSummary))
        <div class="filter-summary">
            @foreach($filterSummary as $label => $value)
                <span><strong>{{ $label }}:</strong> {{ $value }}</span>
            @endforeach
        </div>
    @endif

    <table>
        <thead>
            <tr>
                <th style="width:18%">Action By</th>
                <th style="width:12%">Action</th>
                <th style="width:38%">Description</th>
                <th style="width:14%">Type</th>
                <th style="width:18%">Date Time</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    <td>{{ optional($row->user)->name ?: '—' }}</td>
                    <td>{{ $row->action ?: '—' }}</td>
                    <td>{{ $row->description ?: '—' }}</td>
                    <td>{{ $row->type ?: '—' }}</td>
                    <td>{{ $row->date_time ?: '—' }}</td>
                </tr>
            @empty
                <tr><td colspan="5" class="empty">No records match the current filters.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">Page <span class="pagenum"></span></div>
</body>
</html>
