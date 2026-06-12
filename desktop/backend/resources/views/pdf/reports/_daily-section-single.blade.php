{{-- Single & Night Shift table: 1 IN + 1 OUT per row --}}
<table class="data-table">
    <thead>
        <tr>
            <th class="col-emp" style="width: 18%;">EMPLOYEE</th>
            <th class="col-shift" style="width: 18%;">SHIFT DETAILS</th>
            <th style="width: 9%;">IN TIME</th>
            <th style="width: 9%;">OUT TIME</th>
            <th class="h-late"  style="width: 9%;">LATE IN</th>
            <th class="h-early" style="width: 9%;">EARLY GO</th>
            <th class="h-ot"    style="width: 9%;">OVERTIME</th>
            <th style="width: 9%;">WORK HRS</th>
            <th style="width: 10%;">STATUS</th>
        </tr>
    </thead>
    <tbody>
    @foreach($employees as $empData)
        @php
            $emp = $empData['employee'];
            $day = $empData['days'][0] ?? null;
            if (!$day) continue;

            $hasIn   = ($day['in']  ?? '---') !== '---';
            $hasOut  = ($day['out'] ?? '---') !== '---';
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
                @if($hasIn)
                    <div class="punch-time">{{ $day['in'] }}</div>
                    @if(!empty($day['device_in']))<div class="punch-dev-last">{{ $day['device_in'] }}</div>@endif
                @else
                    <span class="dash">---</span>
                @endif
            </td>
            <td>
                @if($hasOut)
                    <div class="punch-time">{{ $day['out'] }}</div>
                    @if(!empty($day['device_out']))<div class="punch-dev-last">{{ $day['device_out'] }}</div>@endif
                @else
                    <span class="dash">---</span>
                @endif
            </td>
            <td>{{ $hasLate ? $day['late_coming'] : '---' }}</td>
            <td>{{ $hasEarly ? $day['early_going'] : '---' }}</td>
            <td>{{ $hasOt ? $day['ot'] : '---' }}</td>
            <td>{{ $hasHrs ? $day['total_hrs'] : '---' }}</td>
            <td><span class="{{ $statusClass($day['status']) }}">{{ $statusLetter($day['status']) }}</span></td>
        </tr>
    @endforeach
    </tbody>
</table>
