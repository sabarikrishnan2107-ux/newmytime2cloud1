{{-- Split Shift table: stacked IN punches in IN TIME column, stacked OUT in OUT TIME column --}}
<table class="data-table">
    <thead>
        <tr>
            <th class="col-emp" style="width: 16%;">EMPLOYEE</th>
            <th class="col-shift" style="width: 11%;">SHIFT DETAILS</th>
            <th style="width: 9%;">IN TIME</th>
            <th style="width: 9%;">OUT TIME</th>
            <th class="h-late"  style="width: 8%;">LATE IN</th>
            <th class="h-early" style="width: 8%;">EARLY GO</th>
            <th class="h-lost"  style="width: 8%;">LOST HRS</th>
            <th class="h-ot"    style="width: 8%;">OVERTIME</th>
            <th style="width: 8%;">WORK HRS</th>
            <th style="width: 8%;">STATUS</th>
        </tr>
    </thead>
    <tbody>
    @foreach($employees as $empData)
        @php
            $emp = $empData['employee'];
            $day = $empData['days'][0] ?? null;
            if (!$day) continue;

            $logs = $day['logs'] ?? [];
            $insArr  = [];
            $outsArr = [];
            foreach ($logs as $log) {
                $li = $log['in']  ?? null;
                $lo = $log['out'] ?? null;
                $ld = $log['device_in']  ?? ($day['device_in']  ?? '');
                $lod = $log['device_out'] ?? ($day['device_out'] ?? '');
                if ($li && $li !== '---') $insArr[]  = ['t' => $li, 'd' => $ld];
                if ($lo && $lo !== '---') $outsArr[] = ['t' => $lo, 'd' => $lod];
            }
            // fallback: if no logs, fall back to in/out
            if (!count($insArr) && !count($outsArr)) {
                if (($day['in']  ?? '---') !== '---') $insArr[]  = ['t' => $day['in'],  'd' => $day['device_in']  ?? ''];
                if (($day['out'] ?? '---') !== '---') $outsArr[] = ['t' => $day['out'], 'd' => $day['device_out'] ?? ''];
            }

            $hasLate = ($day['late_coming'] ?? '---') !== '---' && $day['late_coming'] !== '00:00';
            $hasEarly= ($day['early_going'] ?? '---') !== '---' && $day['early_going'] !== '00:00';
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
            <td>
                @if(count($insArr))
                    @foreach($insArr as $i => $p)
                        <div class="punch-time">{{ $p['t'] }}</div>
                        <div class="{{ $loop->last ? 'punch-dev-last' : 'punch-dev' }}">{{ $p['d'] }}</div>
                    @endforeach
                @else
                    <span class="dash">---</span>
                @endif
            </td>
            <td>
                @if(count($outsArr))
                    @foreach($outsArr as $i => $p)
                        <div class="punch-time">{{ $p['t'] }}</div>
                        <div class="{{ $loop->last ? 'punch-dev-last' : 'punch-dev' }}">{{ $p['d'] }}</div>
                    @endforeach
                @else
                    <span class="dash">---</span>
                @endif
            </td>
            <td>{{ $hasLate ? $day['late_coming'] : '---' }}</td>
            <td>{{ $hasEarly ? $day['early_going'] : '---' }}</td>
            <td>---</td>
            <td>{{ $hasOt ? $day['ot'] : '---' }}</td>
            <td>{{ $hasHrs ? $day['total_hrs'] : '---' }}</td>
            <td><span class="{{ $statusClass($day['status']) }}">{{ $statusLetter($day['status']) }}</span></td>
        </tr>
    @endforeach
    </tbody>
</table>
