{{-- Multi Shift table: 5 IN/OUT pair cells with device names below --}}
<table class="data-table">
    <thead>
        <tr>
            <th class="col-emp" style="width: 16%;">EMPLOYEE</th>
            <th class="col-shift" style="width: 12%;">SHIFT DETAILS</th>
            <th style="width: 11%;">IN/OUT1</th>
            <th style="width: 11%;">IN/OUT2</th>
            <th style="width: 11%;">IN/OUT3</th>
            <th style="width: 11%;">IN/OUT4</th>
            <th style="width: 11%;">IN/OUT5</th>
            <th class="h-ot" style="width: 6%;">OT</th>
            <th style="width: 6%;">TOTAL</th>
            <th style="width: 5%;">STATUS</th>
        </tr>
    </thead>
    <tbody>
    @foreach($employees as $empData)
        @php
            $emp = $empData['employee'];
            $day = $empData['days'][0] ?? null;
            if (!$day) continue;

            $logs = $day['logs'] ?? [];
            // Build pairs: [{in, out, dev_in, dev_out}, ...]
            $pairs = [];
            foreach ($logs as $log) {
                $li = $log['in']  ?? null;
                $lo = $log['out'] ?? null;
                if (($li === null || $li === '---') && ($lo === null || $lo === '---')) continue;
                $pairs[] = [
                    'in'   => ($li && $li !== '---') ? $li : null,
                    'out'  => ($lo && $lo !== '---') ? $lo : null,
                    'din'  => $log['device_in']  ?? ($day['device_in']  ?? ''),
                    'dout' => $log['device_out'] ?? ($day['device_out'] ?? ''),
                ];
            }
            // Pad to 5 pairs
            while (count($pairs) < 5) {
                $pairs[] = null;
            }
            $pairs = array_slice($pairs, 0, 5);

            $hasOt   = ($day['ot'] ?? '---') !== '---' && $day['ot'] !== '00:00';
            $hasHrs  = ($day['total_hrs'] ?? '---') !== '---';

            $firstName = $emp->first_name ?? '';
            $initial   = $firstName !== '' ? strtoupper(substr($firstName, 0, 1)) : '?';
            $fullName  = trim(($emp->first_name ?? '') . ' ' . ($emp->last_name ?? '')) ?: '---';
            $deptName  = $emp->department->name ?? null;
        @endphp
        <tr>
            <td class="col-emp">
                <table class="emp-inner"><tr>
                    <td style="width: 36px;">
                        @if($emp->profile_picture)
                            <div class="emp-photo"><img src="{{ $emp->profile_picture }}" /></div>
                        @else
                            <div class="emp-photo">{{ $initial }}</div>
                        @endif
                    </td>
                    <td>
                        <div class="emp-name">{{ $fullName }}</div>
                        <div>
                            @if($deptName)<span class="emp-dept">{{ $deptName }}</span> | @endif<span class="emp-dept-id">{{ $emp->employee_id ?? '---' }}</span>
                        </div>
                    </td>
                </tr></table>
            </td>
            <td class="col-shift">
                <div class="shift-time">{{ $day['shift'] ?? '---' }}</div>
                <div class="shift-name">{{ $day['shift_type'] ?? '' }}</div>
            </td>
            @foreach($pairs as $p)
                <td>
                    @if($p === null || ($p['in'] === null && $p['out'] === null))
                        <span class="dash">---</span>
                    @else
                        <div class="pair-time">{{ $p['in'] ?? '--:--' }} - {{ $p['out'] ?? '--:--' }}</div>
                        <div class="pair-type">{{ $p['din'] ?: '---' }} / {{ $p['dout'] ?: '---' }}</div>
                    @endif
                </td>
            @endforeach
            <td>{{ $hasOt ? $day['ot'] : '---' }}</td>
            <td>{{ $hasHrs ? $day['total_hrs'] : '---' }}</td>
            <td><span class="{{ $statusClass($day['status']) }}">{{ $statusLetter($day['status']) }}</span></td>
        </tr>
    @endforeach
    </tbody>
</table>
