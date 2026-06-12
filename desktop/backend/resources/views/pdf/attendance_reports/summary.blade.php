<!DOCTYPE html>
<html>

<head>
    <style>
        * {
            margin: 0;
            padding: 0;
            font-size: 9px;
        }

        table {
            font-family: arial, sans-serif;
            border-collapse: collapse;
            border: none;
            width: 100%;
        }

        td,
        th {
            border: 1px solid #eeeeee;
            text-align: center;
            font-size: 9px;
        }

        footer {
            border-top: 1px solid #eeeeee;
            position: fixed;
            bottom: 5px;
            left: 0;
            width: 100%;
            padding: 0px 5px;
        }

        .container {
            margin: 25px
        }
    </style>
    <title>Daily</title>
</head>

<body class="container">

    <table>
        <tr>
            <td style="border: none;width:33%;">
                <div class="row">
                    <div style="background-coldor: rgb(253, 246, 246);padding:0px;margin:0px 5px">
                        <table style="padding:0px;margin:0px">
                            <tr style="text-align: left; border :none; ">
                                <td style="text-align: left; border :none;font-size:11px;">
                                    <b>
                                        {{ $company['name'] }}
                                    </b>
                                    <br>
                                </td>
                            </tr>
                            <tr style="text-align: left; border :none;">
                                <td style="text-align: left; border :none;font-size:11px;">
                                    <span style="font-size:9px;">Email
                                        {{ $company['email'] }}</span>
                                    <br>
                                </td>
                            </tr>
                            <tr style="text-align: left; border :none;">
                                <td style="text-align: left; border :none;font-size:11px;">
                                    <span style="font-size:9px;">{{ $company['location'] }}</span>
                                    <br>
                                </td>
                            </tr>

                            <tr style="text-align: left; border :none;">
                                <td style="text-align: left; border :none;font-size:11px;">
                                    <span style="font-size:9px;">{{ $company['contact'] }}</span>
                                    <br>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </td>
            <td style="border: none;width:33%;text-align:center">
                <div style="text-align:center;height:60px;">
                    @if (env('APP_ENV') !== 'production')
                        <img src="https://backend.mytime2cloud.com/upload/1703668474.png"
                            style="width:100px;">
                    @else
                        <img src="{{ $company['logo_raw'] }}" style="width:100px;" />
                    @endif

                </div>
                <div style="margin-top: 50px;">
                    <b style="font-size: 11px">
                        Summary Report
                    </b>
                    <div style="font-size: 11px;margin-top:5px;">
                        <span
                            style="border-top: 2px solid #eeeeee;border-bottom: 2px solid #eeeeee; padding-top:3px;padding-bottom:3px;">
                            {{ date('d-M-Y', strtotime($company['from_date'])) }} -
                            {{ date('d-M-Y', strtotime($company['to_date'])) }}
                        </span>
                    </div>
                </div>

            </td>
            <td style="border: none">
            </td>
        </tr>
    </table>

    <table style="margin-top:30px">
        <tr>
            <td style="text-align: left;padding:5px;">Employee</td>
            <td style="text-align: center; padding:5px;">Branch</td>
            <td style="text-align: center; padding:5px;">Shift</td>

            @if ($shift_type == 'General')
                <td style="text-align: center; padding:5px;"> In Time </td>
                <td style="text-align: center; padding:5px;"> Out Time </td>
                <td style="text-align: center; padding:5px;"> Late In </td>
                <td style="text-align: center; padding:5px;"> Early Out </td>
            @endif


            @if ($shift_type == 'Multi')
                @for ($i = 0; $i < 5; $i++)
                    <td style="text-align: center; padding:5px;">
                        In{{ $i + 1 }}
                    </td>
                    <td style="text-align: center; padding:5px;">
                        Out{{ $i + 1 }}
                    </td>
                @endfor
            @endif

            <td>Total Hrs</td>
            <td>Status</td>
        </tr>
        @foreach ($attendances as $empID => $attendance)
            @php
                $statusColor = null;
                $statusName = $attendance->status ?? '---';
                if ($attendance->status == 'P' || $attendance->status == 'LC' || $attendance->status == 'EG') {
                    $statusColor = 'green';
                    $statusName = 'P';
                } elseif ($attendance->status == 'A' || $attendance->status == 'M') {
                    $statusColor = 'red';
                    $statusName = $attendance->status == 'A' ? "A" : "?";
                } elseif ($attendance->status == 'O') {
                    $statusColor = 'gray';
                } elseif ($attendance->status == 'L') {
                    $statusColor = 'blue';
                } elseif ($attendance->status == 'H') {
                    $statusColor = 'pink';
                } elseif ($attendance->status == '---') {
                    $statusColor = '';
                }

                // $pic = env('BASE_URL') . '/no-profile-image.jpg';

                $pic = 'https://backend.mytime2cloud.com/media/employee/profile_picture/' . $attendance->employee->profile_picture_raw;

            @endphp
            <tr>
                <td style="text-align:left;width:200px;">
                    <table>
                        <tr>
                            <td
                                style="border: none;text-align:left;width:25px;padding-left:5px;padding-top:2px;padding-bottom:2px;">
                                <img src="{{ $pic }}" style="border-radius:50%;width:25px; " />
                            </td>
                            <td style="border: none;text-align:left;padding-left:8px;">
                            
                                {{ $attendance->employee->first_name }}
                                <br>
                                <small>{{ $attendance->employee->employee_id }}</small>
                            </td>
                        </tr>
                    </table>
                </td>

                <td>
                    {{ $attendance->employee->branch->branch_name }}
                    {{-- / {{ $attendance->employee->department->name }} --}}
                </td>

                <td style="text-align:  center;">
                    <div>
                        {{ $attendance->schedule->shift->on_duty_time }} -
                        {{ $attendance->schedule->shift->off_duty_time }}
                        <smal>
                            {{ $attendance->schedule->shift->name }}
                        </smal>
                    </div>
                </td>

                @if ($shift_type == 'General')
                    <td>
                        {{ $attendance->in ?? '---' }}
                    </td>
                    <td>
                        {{ $attendance->out ?? '---' }}
                    </td>
                    <td>
                        {{ $attendance->late_coming ?? '---' }}
                    </td>
                    <td>
                        {{ $attendance->early_going ?? '---' }}
                    </td>
                @endif

                @if ($shift_type == 'Multi')
                    @for ($i = 0; $i < 5; $i++)
                        <td>
                            {{ $attendance->logs[$i]['in'] ?? '---' }}
                        </td>
                        <td>
                            {{ $attendance->logs[$i]['out'] ?? '---' }}
                        </td>
                    @endfor
                @endif
                <td>{{ $attendance->total_hrs }}</td>
                <td style="color:{{ $statusColor }}">
                    {{ $statusName }}
                </td>

            </tr>
            </tr>
        @endforeach

    </table>

    <footer>
        <table>
            <tr style="border :none">
                <td style="text-align: left;border :none;width:33%;">
                    <span style="color: green">P = Present</span>, <span style="color: red">A = Absent</span>, <span
                        style="color: grey">O = WeekOff</span>, <span style="color: blue">L = Leave</span>
                </td>

                <td style="text-align: center;border :none;width:33%;">
                    <b>Powered by</b>: <span style="color:blue">
                        <a href="{{ env('APP_URL') }}" target="_blank">{{ env('APP_NAME') }}</a>
                    </span> Printed on : {{ date('d-M-Y ') }}
                </td>

                <td style="text-align: right;border :none;width:33%;padding-right:15px;">
                    Page : {{ $counter }}
                </td>
            </tr>
        </table>
    </footer>
</body>

</html>
