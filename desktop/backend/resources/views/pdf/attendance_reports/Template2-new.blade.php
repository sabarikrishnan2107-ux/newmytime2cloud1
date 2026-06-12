<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Multi-Page Report Example</title>
    <style>
        @page {
            margin: 2px;
        }

        body {
            font-family: 'Inter', Arial, Helvetica, sans-serif;
            color: #1e293b;
            /* dark text */
            margin: 0;
            padding: 0;
            /* Added padding to body for better look */
            font-size: 14px;
        }

        /* --- Header Styles --- */
        .header-table {
            width: 100%;
            border-collapse: collapse;
        }

        .header-table td {
            padding-bottom: 16px;
            vertical-align: top;
        }

        .header-logo {
            height: 64px;
            margin-right: 16px;
            border-radius: 8px;
            /* Added slight rounding to logo placeholder */
        }

        .header-title {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
        }

        .header-subtitle {
            font-size: 14px;
            color: #64748b;
            margin: 0;
        }

        .company-info {
            text-align: right;
            font-size: 14px;
        }

        .company-name {
            font-weight: bold;
            font-size: 18px;
            color: #1e293b;
            margin: 0;
        }

        /* --- Details Table (4 Columns) --- */
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            /* Reduced from 24px */
        }

        .details-table td {
            width: 25%;
            padding: 0 4px;
        }

        .detail-label {
            font-size: 10px;
            color: #64748b;
            margin: 0;
            padding: 0;
        }

        .detail-value {
            font-size: 14px;
            font-weight: bold;
            color: #1e293b;
            margin: 0;
            padding: 0;
        }

        /* --- Summary Stats Table (7 Columns) ---
       Updated for Card look: Removed outer border/rounding, added spacing.
      */
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            margin-top: 10px;
            text-align: center;
            border: none;
        }

        .stats-table td {
            width: 14.28%;
            padding: 0 2px;
            /* ⬅️ Add horizontal padding for spacing */
            border: none;
            box-shadow: none;
            vertical-align: top;
        }

        /* New class for the inner element that acts as the card/block */
        .stat-card-inner {
            padding: 10px 4px;
            /* Padding moved inside the div */
            border-radius: 8px;
            /* Subtle shadow for lift effect, making it look like a card */
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
            border: 1px solid #fff;
            /* Very light inner border */
        }

        .stat-label {
            font-size: 12px;
            margin: 0;
        }

        .stat-value {
            font-size: 20px;
            font-weight: bold;
            margin: 0;
        }

        /* Specific Stat Colors (applied to .stat-card-inner) */
        .bg-green-100 {
            background-color: #dcfce7;
        }

        .text-green-600 {
            color: #166534;
        }

        .text-green-700 {
            color: #16a34a;
        }

        .bg-red-100 {
            background-color: #fee2e2;
        }

        .text-red-600 {
            color: #991b1b;
        }

        .text-red-700 {
            color: #dc2626;
        }

        .bg-blue-100 {
            background-color: #dbeafe;
        }

        .text-blue-600 {
            color: #1e40af;
        }

        .text-blue-700 {
            color: #2563eb;
        }

        .bg-yellow-100 {
            background-color: #fef9c3;
        }

        .text-yellow-600 {
            color: #854d0e;
        }

        .text-yellow-700 {
            color: #ca8a04;
        }

        .bg-indigo-100 {
            background-color: #f3e8ff;
        }

        .text-indigo-600 {
            color: #6b21a8;
        }

        .text-indigo-700 {
            color: #9333ea;
        }

        .bg-gray-100 {
            background-color: #e5e7eb;
        }

        .text-gray-600 {
            color: #1f2937;
        }

        .text-gray-700 {
            color: #4b5563;
        }

        .bg-purple-100 {
            background-color: #fce7f3;
        }

        .text-purple-600 {
            color: #9d174d;
        }

        .text-purple-700 {
            color: #db2777;
        }

        .date-col {
            font-weight: bold;
            color: #1e293b;
            white-space: nowrap;
        }

        .device-info {
            font-size: 10px;
            color: #64748b;
        }

        .late-early-time {
            color: #f97316;
        }


        .footer-total-label {
            text-align: right;
        }

        /* Custom background for total row to contrast better */


        /* Add this class to your <style> block */
        footer {
            bottom: 0px;
            position: absolute;
            width: 100%;
        }

        #footer .page:before {
            content: counter(page, decimal);
        }

        #footer .page:after {
            counter-increment: counter(page, decimal);
        }

        .pagenum:before {
            content: "Page " counter(page);
            /* Only current page works in browsers */
        }

        /* Demo content */
        main {
            padding: 20px 40px;
        }

        h1 {
            page-break-after: avoid;
        }

        .force-break {
            page-break-after: always;
        }


        .pageCounter span {
            counter-increment: pageTotal;
        }

        #pageNumbers div:before {
            counter-increment: currentPage;
            content: "Page " counter(currentPage) " of 1";
            font-size: 9px
        }

        #footer-section {
            width: 94%;
            /* your desired width */
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            margin: 0 auto;
            /* centers the footer */
            text-align: center;
            font-size: 12px;
            counter-reset: pageTotal;
        }

        table {
            border-collapse: collapse;
            border: none;
            width: 100%;
        }

        .th-font-size {
            font-size: 11px !important;
        }

        .text-center {
            text-align: center;
        }

        th {
            font-size: 9px;

        }

        td {
            font-size: 9px;
        }

        td,
        th {
            border: 1px solid #d6d6d6;
        }
    </style>
</head>

<body>

    @php

        $isSmall = $shift_type == 'Multi' || $shift_type == 'Double';

        if (!function_exists('timeToMinutes')) {
            function timeToMinutes($time)
            {
                [$hours, $minutes] = explode(':', $time);
                return $hours * 60 + $minutes;
            }
        }

        if (!function_exists('minutesToTime')) {
            function minutesToTime($minutes)
            {
                $hours = floor($minutes / 60);
                $minutes = $minutes % 60;
                return sprintf('%02d:%02d', $hours, $minutes);
            }
        }

        // Convert times to minutes
        $minutes1 = timeToMinutes($info->total_late ?? '00:00');
        $minutes2 = timeToMinutes($info->total_early ?? '00:00');

        // Add the minutes
        $totalMinutes = $minutes1 + $minutes2;

        // Convert total minutes back to time format
        $totalTime = minutesToTime($totalMinutes);

        $manualRecordCounter = $data
            ->filter(function ($item) {
                return $item->device_out?->short_name === 'Manual' || $item->device_in?->short_name === 'Manual';
            })
            ->count();

        $statusMap = [
            'P' => [
                'text' => 'P',
                'class' => 'bg-green-100',
                'color' => 'text-green-600',
            ],
            'LC' => [
                'text' => 'P',
                'class' => 'bg-green-100',
                'color' => 'text-green-600',
            ],
            'EG' => [
                'text' => 'P',
                'class' => 'bg-green-100',
                'color' => 'text-green-600',
            ],
            'A' => ['text' => 'A', 'class' => 'bg-red-100', 'color' => 'text-red-600'],
            'M' => [
                'text' => 'M',
                'class' => 'bg-gray-100',
                'color' => 'text-gray-600',
            ],
            'O' => [
                'text' => 'W',
                'class' => 'bg-yellow-100',
                'color' => 'text-yellow-600',
            ],
            'L' => [
                'text' => 'L',
                'class' => 'bg-yellow-100',
                'color' => 'text-yellow-600',
            ],
            'H' => [
                'text' => 'H',
                'class' => 'bg-indigo-100',
                'color' => 'text-indigo-600',
            ],
        ];

        $defaultStatus = ['text' => '---', 'class' => 'bg-gray-50', 'color' => 'text-gray-400'];

    @endphp



    <footer id="footer-section">
        <table style="margin-top: 60px">
            <tr>
                <td style="border: none">
                    <span style="color:#166534 !important; font-size:10px; ">
                        P = Present,
                    </span>
                    <span style="color:#991b1b !important; font-size:10px; ">
                        A = Absent,
                    </span>
                    <span style="color:#1e40af !important; font-size:10px; ">
                        W = Week Off,
                    </span>
                    <span style="color:#854d0e !important; font-size:10px; ">
                        L = Leaves,
                    </span>
                    <span style="color:#6b21a8 !important; font-size:10px; ">
                        H = Holiday,
                    </span>
                    <span style="color:#1f2937 !important; font-size:10px; ">
                        M = Missed
                    </span>
                </td>
            </tr>
        </table>
        <div style="border-top: #949494 1px solid;"></div>
        <table style="width: 100%">
            <tr style="border :none">
                <td style="text-align: left;border :none;width:33%;font-size: 9px">
                    Printed on : {{ date('d-M-Y ') }}
                </td>

                <td style="text-align: center;border :none;width:33%;font-size: 9px">
                    Powered by https://mytime2cloud.com</a>
                </td>
                <td style="text-align: right;border :none;width:33%;font-size: 9px">
                    <div id="footer">
                        <div id="pageNumbers">
                            <div style="font-size: 9px"></div>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </footer>

    <main>

        {{-- FIRST PAGE --}}
        <div class="">
            {{-- Your special header with logo, details, stats... --}}
            <table class="header-table">
                <tr>
                    <td style="border: none;width:50%">
                        <table style="border-collapse: collapse; width: 100%;">
                            <tr>
                                <!-- Logo -->
                                <td style="border: none; padding: 0; width: 70px; vertical-align: middle;">
                                    <img alt="Company Logo"
                                        src="{{ env('BASE_URL', 'https://backend.mytime2cloud.com') . '/' . $company->logo_raw }}"
                                        onerror="this.onerror=null; this.src='https://placehold.co/64x64/4f46e5/ffffff?text=Logo';"
                                        style="width: 60px; height: auto; display: block; margin: 0;" />
                                </td>

                                <!-- Text -->
                                <td style="border: none; padding: 0; vertical-align: middle;">
                                    <p style="margin: 0; font-size: 16px; font-weight: bold;">
                                        Monthly Attendance Report
                                    </p>
                                    <p style="margin: 0; font-size: 12px; color: #555;">
                                        {{ date('d M Y', strtotime($from_date)) }} -
                                        {{ date('d M Y', strtotime($to_date)) }}
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="company-info" style="border: none;width:50%">
                        <p class="company-name">{{ $company->name ?? '' }}</p>
                        <p class="header-subtitle">{{ $company->user->email ?? '' }}</p>
                        <p class="header-subtitle">{{ $company->contact->number ?? '' }}</p>
                        <p class="header-subtitle">
                            {{ $employee?->branch?->branch_name ?? 'Default Branch' }}
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Employee Details -->
            <div
                style="border: 1px  solid #eeeeee;border-radius: 8px; width:97%;margin:0 auto; padding:10px 10px 0 10px;">
                <table class="details-table">
                    <tr>
                        <td style="border: none;padding:0;">
                            <p class="detail-label">EMPLOYEE</p>
                            <p class="detail-value">{{ $employee->full_name }} ({{ $employee->employee_id }})</p>
                        </td>
                        <td style="border: none;padding:0;">
                            <p class="detail-label">DEPARTMENT</p>
                            <p class="detail-value">{{ $employee?->department?->name ?? '---' }}</p>
                        </td>
                        <td style="border: none;padding:0;">
                            <p class="detail-label">BRANCH NAME</p>
                            <p class="detail-value">{{ $employee?->branch?->branch_name ?? 'Default Branch' }}</p>
                        </td>
                        <td style="border: none;padding:0;">
                            <p class="detail-label">SHIFT TYPE</p>
                            <p class="detail-value">{{ $data[0]->schedule->shift_type->name }}
                            </p>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Summary Stats -->
            <table class="stats-table">
                <tr>
                    <td>
                        <div class="stat-card-inner bg-green-100">
                            <p class="stat-label text-green-600">Present</p>
                            <p class="stat-value text-green-700">{{ $info->total_present }}</p>
                        </div>
                    </td>
                    <td>
                        <div class="stat-card-inner bg-red-100">
                            <p class="stat-label text-red-600">Absent</p>
                            <p class="stat-value text-red-700">{{ $info->total_absent }}</p>
                        </div>
                    </td>
                    <td>
                        <div class="stat-card-inner bg-blue-100">
                            <p class="stat-label text-blue-600">Week Off</p>
                            <p class="stat-value text-blue-700">{{ $info->total_off }}</p>
                        </div>
                    </td>
                    <td>
                        <div class="stat-card-inner bg-yellow-100">
                            <p class="stat-label text-yellow-600">Leaves</p>
                            <p class="stat-value text-yellow-700">{{ $info->total_leave }}</p>
                        </div>
                    </td>
                    <td>
                        <div class="stat-card-inner bg-indigo-100">
                            <p class="stat-label text-indigo-600">Holidays</p>
                            <p class="stat-value text-indigo-700">{{ $info->total_holiday }}</p>
                        </div>
                    </td>
                    <td>
                        <div class="stat-card-inner bg-gray-100">
                            <p class="stat-label text-gray-600">Missing</p>
                            <p class="stat-value text-gray-700">{{ $info->total_missing }}</p>
                        </div>
                    </td>
                    <td>
                        <div class="stat-card-inner bg-purple-100">
                            <p class="stat-label text-purple-600">Manual Punches</p>
                            <p class="stat-value text-purple-700">{{ $manualRecordCounter }}</p>
                        </div>
                    </td>
                </tr>
            </table>

            <table
                style="margin-top:10px;margin-bottom:10px;border: none;  border-spacing: 0;border-collapse: collapse;width:100% !important;">
                <tbody>
                    <tr>
                        <td style="border: none;width:50%; padding: 5px 5px;">
                            <div style="border-radius: 10px; overflow: hidden">
                                <table style="width: 100%;background-color: #ffedd5;padding: 1px 0 2px 0;">
                                    <tr>
                                        <td colspan="3"
                                            style="border: none;text-align:center;padding:3px !important;">
                                            <div style="color: #9a3412;font-size:11px;">
                                                Late Hours / Early Go
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="width:33%;text-align: center;border: none;">
                                            <div style="margin: 0">Late In</div>
                                            <h2 style="color: #ea580c; margin: 0">{{ $info->total_late ?? 0 }}</h2>
                                        </td>
                                        <td style="width:33%;text-align: center;border: none;">
                                            <div style="margin: 0">Early Go</div>
                                            <h2 style="color: #ea580c; margin: 0">{{ $info->total_early ?? 0 }}</h2>
                                        </td>
                                        <td style="width:33%;text-align: center;border: none;">
                                            <div style="margin: 0">Total</div>
                                            <h2 style="color: #ea580c; margin: 0">{{ $totalTime }}</h2>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>

                        <td style="border: none;width:50%; padding: 5px 5px;">
                            <div style="border-radius: 10px; overflow: hidden">
                                <table
                                    style="
                  width: 100%;
                  background-color: #e0e7ff;
                  padding: 1px 0 2px 0;
                ">
                                    <tr>
                                        <td colspan="3"
                                            style="border: none;text-align:center;padding:3px !important;">
                                            <div style="color: #3730a3;font-size:11px;">
                                                Overtime Hours
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="width:33%;text-align: center;border: none;">
                                            <div style="margin: 0">Before Duty</div>
                                            <h2 style="color: #4f46e9; margin: 0">{{ '00:00' }}</h2>
                                        </td>
                                        <td style="width:33%;text-align: center;border: none;">
                                            <div style="margin: 0">After Duty</div>
                                            <h2 style="color: #4f46e9; margin: 0">{{ '00:00' }}</h2>
                                        </td>
                                        <td style="width:33%;text-align: center;border: none;">
                                            <div style="margin: 0">Total</div>
                                            <h2 style="color: #4f46e9; margin: 0">
                                                {{ $info->total_ot_hours ?? '00:00' }}</h2>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <table style="margin-top: 15px !important; width:100% !important;">
                <tr>
                    <tbody>
                        <tr>
                            <td
                                style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};background-color:#f0f3f5 !important;color:#374151; !important;">
                                <b>DATES</b>
                            </td>
                            @foreach ($data as $date)
                                <td style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};background-color:#f0f3f5 !important;color:#374151; !important;"
                                    class="text-center">
                                    <b>{{ date('d', strtotime($date->date)) ?? '---' }}</b>
                                </td>
                            @endforeach
                        </tr>
                    </tbody>
                </tr>

                <tr>
                    <td
                        style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};background-color:#f0f3f5 !important;color:#374151; !important;">
                        <b>DAYS</b>
                    </td>

                    @foreach ($data as $date)
                        <td class="text-center"
                            style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};background-color:#f0f3f5 !important;color:#374151; !important;">
                            <b>{{ strtoupper(date('D', strtotime($date->date))) ?? '---' }}</b>
                        </td>
                    @endforeach
                </tr>

                <?php if (in_array($shift_type_id, [1, 4, 6])) { ?>
                <tr style="background-color: none;">
                    <td
                        style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};">
                        In</td>

                    @foreach ($data as $date)
                        <td class="text-center"
                            style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};color: {{ $date?->device_in?->name == 'Manual' ? '#f6607b !important;' : '' }}">
                            <span>{{ $date->in ?? '---' }}</span><br> <span
                                style="font-size: 7px">{{ $date?->device_in?->short_name ?? '' }}</span>
                        </td>
                    @endforeach
                </tr>
                <tr style="background-color: none;">
                    <td
                        style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};">
                        Out </td>
                    @foreach ($data as $date)
                        <td class="text-center"
                            style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};color: {{ $date?->device_out?->name == 'Manual' ? '#f6607b !important;' : '' }}">
                            <span>{{ $date->out ?? '---' }}</span><br> <span
                                style="font-size: 7px">{{ $date?->device_out?->short_name ?? '' }}</span>
                        </td>
                    @endforeach
                </tr>
                <?php } ?>

                @if ($isSmall)
                    @for ($i = 0; $i < $log_column_length; $i++)
                        <tr>
                            <td
                                style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};">
                                In{{ $i + 1 }}</td>
                            @foreach ($data as $date)
                                <td class="text-center"
                                    style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};">
                                    {{ $date->logs[$i]['in'] ?? '---' }}
                                    <div class="secondary-value"
                                        style="font-size:7px; color: {{ ($date->logs[$i]['device_in'] ?? '') === 'Manual' ? 'red' : '' }}">
                                        {{ $date->logs[$i]['device_in'] ?? '---' }}
                                    </div>
                                </td>
                            @endforeach
                        </tr>
                        <tr>
                            <td
                                style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};">
                                Out{{ $i + 1 }}</td>
                            @foreach ($data as $date)
                                <td style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};"
                                    class="text-center">{{ $date->logs[$i]['out'] ?? '---' }}
                                    <div class="secondary-value"
                                        style="font-size:7px; color: {{ ($date->logs[$i]['device_out'] ?? '') === 'Manual' ? 'red' : '' }}">
                                        {{ $date->logs[$i]['device_out']['short_name'] ?? '---' }}
                                    </div>
                                </td>
                            @endforeach
                        </tr>
                    @endfor
                @endif

                @if ($shift_type_id == 4 || $shift_type_id == 6)
                    <tr>
                        <td
                            style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};">
                            Late In </td>
                        @foreach ($data as $date)
                            <td style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};"
                                class="text-center"> {{ $date->late_coming ?? '---' }}
                            </td>
                        @endforeach
                    </tr>

                    <tr>
                        <td
                            style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};">
                            Early Out </td>
                        @foreach ($data as $date)
                            <td style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};"
                                class="text-center"> {{ $date->early_going ?? '---' }}
                            </td>
                        @endforeach
                    </tr>
                @endif
                <tr>
                    <td
                        style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};">
                        OT </td>
                    @foreach ($data as $date)
                        <td style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};"
                            class="text-center"> {{ $date->ot ?? '---' }}
                        </td>
                    @endforeach
                </tr>
                <tr>
                    <td
                        style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};border-top:2px solid #bdbdbd; border-left:1px solid #ddd; border-right:1px solid #ddd; border-bottom:1px solid #ddd;">
                        T. Hrs</td>
                    @foreach ($data as $date)
                        <td style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};border-top:2px solid #bdbdbd; border-left:1px solid #ddd; border-right:1px solid #ddd; border-bottom:1px solid #ddd;"
                            class="text-center">
                            {{ $date->total_hrs ?? '--' }}
                        </td>
                    @endforeach
                </tr>

                <tr>
                    <td  style="font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};"> Status </td>
                    @foreach ($data as $date)
                        @php
                            $status = $statusMap[$date->status] ?? $defaultStatus;
                            $statusText = $status['text'];
                            $statusColor = $status['color'];
                        @endphp
                        <td class="text-center" style="color:{{ $statusColor }} !important;font-size: {{ $isSmall ? '9px' : '10px' }}; padding: {{ $isSmall ? '4px 3px' : '6px 4px' }};">
                            <span class="{{ $statusColor }}" style="font-size:12px;"> {{ $statusText }}</span>
                            <div style="font-size:6px">
                                @if ($date['shift'] && $date->status == 'P')
                                    @php

                                        $shiftWorkingHours = $date['shift']['working_hours'];
                                        $employeeHours = $date['total_hrs'];

                                        if (
                                            $shiftWorkingHours !== '' &&
                                            $employeeHours !== '' &&
                                            $shiftWorkingHours !== '---' &&
                                            $employeeHours !== '---'
                                        ) {
                                            [$hours, $minutes] = explode(':', $shiftWorkingHours);
                                            $shiftWorkingHours = $hours * 60 + $minutes;

                                            [$hours, $minutes] = explode(':', $employeeHours);
                                            $employeeHours = $hours * 60 + $minutes;

                                            if ($employeeHours < $shiftWorkingHours) {
                                                echo 'Short Shift';
                                            }
                                    } @endphp
                                @endif
                            </div>
                        </td>
                    @endforeach
                </tr>
            </table>
        </div>
    </main>

</body>

</html>
