<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

<body>
    <table style="margin-top: -20px !important;backgroundd-color:blue;padding-bottom:0px ">
        <tr>
            <td style="text-align: left;width: 300px; border :none; padding:15px;   backgrozund-color: red">
                <div style=";">
                    <br> <br> <br>
                    @if (env('APP_ENV') !== 'local')
                    <img src="{{ $company->logo }}" height="120px" width="180px">
                    @else
                    <img src="{{ getcwd() . '/upload/app-logo.jpeg' }}" height="120px" width="180px">
                    @endif

                    <table style="text-align: right; border :none; width:180px; margin-top:5px;baczkground-color:blue">
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: right; border :none;font-size:10px">
                                <b>
                                    {{ $company->name }}
                                    {{-- <>{{ $company->name ?? 'Akkil Security & Alarm System LLC' }} --}}
                                </b>
                                <br>
                            </td>
                        </tr>
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: right; border :none;font-size:10px">
                                <span style="margin-right: 3px">P.O.Box {{ $company->p_o_box_no }}</span>
                                <br>
                            </td>
                        </tr>
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: right; border :none;font-s ize:10px">
                                <span style="margin-right: 3px">{{ $company->location }}</span>
                                <br>
                            </td>
                        </tr>
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: right; border :none;font-size:10px">
                                <span style="margin-right: 3px">{{ $company->contact->number ?? '' }}</span>
                                <br>
                            </td>
                        </tr>
                    </table>
                </div>
            </td>
            <td style="text-align: left;width: 333px; border :none; padding:15px; backgrozusnd-color:blue">
                <div>
                    <table style="text-align: left; border :none;  ">
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: center; border :none">
                                <span class="title-font">
                                    {{ $info->report_type }} Employee Report
                                </span>
                                <hr style="width: 230px">
                            </td>
                        </tr>
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: center; border :none">
                                <span style="font-size: 11px">
                                    {{ date('d-M-Y', strtotime($company->start)) }} -
                                    {{ date('d-M-Y', strtotime($company->end)) }}
                                </span>
                                <hr style="width: 230px">
                            </td>
                        </tr>
                    </table>
                </div>
            </td>
            <td style="text-align: right;width: 300px; border :none; backgrounsd-color: red">
                <table class="summary-table" style="border:none; padding:0px 50px; margin-left:35px;margin-top:20px;margin-bottom:0px">
                    <tr style="border: none">
                    </tr>
                    <tr class="summary-header" style="border: none;background-color:#eeeeee">
                        <th style="text-align: center; border :none; padding:5px">Present</th>
                        <th style="text-align: center; border :none">Absent</th>
                    </tr>
                    <tr style="border: none">
                        <td style="text-align: center; border :none; padding:5px;color:green">
                            {{ $info->total_present }}
                        </td>
                        <td style="text-align: center; border :none;color:red">{{ $info->total_absent ?? 0 }}</td>
                    </tr>
                </table>
                <table class="summary-table" style="border:none; padding:0px 50px; margin-left:35px;margin-top:20px;margin-bottom:0px">
                    <tr style="border: none">
                    </tr>
                    <tr class="summary-header" style="border: none;background-color:#eeeeee">
                        <th style="text-align: center; border :none; padding:5px">Missing</th>
                        <th style="text-align: center; border :none">Week Off</th>
                    </tr>
                    <tr style="border: none">
                        <td style="text-align: center; border :none; padding:5px;color:orange">
                            {{ $info->total_missing }}
                        </td>
                        <td style="text-align: center; border :none;color:gray">{{ $info->total_off ?? 0 }}</td>
                    </tr>
                </table>
                <br>
            </td>

            </td>
        </tr>
    </table>
    <hr style="margin:0px;padding:0">

    <div id="footer">
        <div class="pageCounter">
            {{-- <p class="page"> </p> --}}
            <p></p>
            @php
            $p = count($data) / 50;
            if ($p <= 1) { echo '<span></span>' ; } else { for ($a=1; $a <=$p; $a++) { echo '<span></span>' ; } } @endphp </div>
                <div id="pageNumbers">
                    <div class="page-number" style="font-size: 9px"></div>
                </div>
        </div>

        <footer id="page-bottom-line" style="padding-top: 100px!important">
            <hr style="width: 100%;">
            <table class="footer-main-table">
                <tr style="border :none">
                    <td style="text-align: left;border :none"><b>Device</b>: Main Entrance = MED, Back Entrance = BED</td>
                    <td style="text-align: left;border :none"><b>Shift Type</b>: Manual = MA, Auto = AU, NO = NO</td>
                    <td style="text-align: left;border :none"><b>Shift</b>: Morning = Mor, Evening = Eve, Evening2 = Eve2
                    </td>
                    <td style="text-align: right;border :none;">
                        <b>Powered by</b>: <span style="color:blue">
                            <a href="https://ideahrms.com/" target="_blank">ideahrms.com</a>
                        </span>
                    </td>
                    <td style="text-align: right;border :none">
                        Printed on : {{ date('d-M-Y ') }}
                    </td>
                </tr>
            </table>
        </footer>
        @php
        $statusColor = '';
        $i = 0;
        @endphp

        <table class="main-table" style="margin-bottom:0px;padding-bottom:0px">
            <tr>
                <td>Employee Id : {{ $info->employee->employee_id }}</td>
                <td>Employee Name : {{ $info->employee->display_name }}</td>
                <td>Department : {{ $info->employee->department->name ?? 'All' }}</td>
                <td>Total Working Hours : {{ $info->total_hours }}</td>
                <td>Total OT Hours : {{ $info->total_ot_hours }}</td>
            </tr>
        </table>
        <table class="main-table">
            <tr style="text-align: left;font-weight:bold">
                <td style="text-align:  left;width:10px"> # </td>
                <td style="text-align:  center;width:40px"> Date </td>
                <td style="text-align:  center;width:40px"> Day </td>
                <td style="text-align:  center;width:80px"> Roster </td>

                <td style="text-align:  center;width:40px"> In1 </td>
                <td style="text-align:  center;width:40px"> Out1 </td>

                <td style="text-align:  center;width:40px"> In2 </td>
                <td style="text-align:  center;width:40px"> Out2 </td>

                <td style="text-align:  center;width:40px"> In3 </td>
                <td style="text-align:  center;width:40px"> Out3 </td>

                <td style="text-align:  center;width:40px"> In4 </td>
                <td style="text-align:  center;width:40px"> Out4 </td>

                <td style="text-align:  center;width:40px"> In5 </td>
                <td style="text-align:  center;width:40px"> Out5 </td>

                <td style="text-align:  center;width:40px"> Total Hours </td>
                <td style="text-align:  center;width:40px"> OT </td>
                <td style="text-align:  center;width:40px"> Status </td>
            </tr>
            {{-- @dd($data) --}}
            @foreach ($data as $employee)
            @php
            $employee = $employee[0];
            if ($employee->status == 'P') {
            $statusColor = 'green';
            } elseif ($employee->status == 'A') {
            $statusColor = 'red';
            } elseif ($employee->status == 'O') {
            $statusColor = 'gray';
            } elseif ($employee->status == 'M') {
            $statusColor = 'orange';
            } elseif ($employee->status == '---') {
            $statusColor = '#f34100ed';
            }
            @endphp
            <tbody>
                <tr style="text-align:  center;">
                    <td>{{ ++$i }}</td>
                    <td style="text-align:  center;">{{ $employee->date ?? '---' }}</td>
                    <td style="text-align:  center;">{{ date('D', strtotime($employee->date)) ?? '---' }}</td>
                    <td style="text-align:  center;">{{ $employee->roster->name ?? '---' }}</td>
                    <td style="text-align:  center;"> {{ $employee->logs[0]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->logs[0]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->logs[1]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->logs[1]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->logs[2]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->logs[2]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->logs[3]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->logs[3]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->logs[4]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->logs[4]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->total_hrs ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $employee->ot ?? '---' }} </td>
                    <td style="text-align:  center; color:{{ $statusColor }}"> {{ str_replace("O","W",$employee->status) ?? '---' }}
                    </td>
                </tr>
            </tbody>
            @endforeach
        </table>
        @php

        @endphp

</body>
<style>
    .pageCounter span {
        counter-increment: pageTotal;
    }

    #pageNumbers div:before {
        counter-increment: currentPage;
        content: "Page " counter(currentPage) " of ";
    }

    #pageNumbers div:after {
        content: counter(pageTotal);
    }

    #footer {
        position: fixed;
        top: 720px;
        right: 0px;
        bottom: 0px;
        text-align: center;
        font-size: 12px;
    }

    #page-bottom-line {
        position: fixed;
        right: 0px;
        bottom: -6px;
        text-align: center;
        font-size: 12px;
        counter-reset: pageTotal;
    }

    #footer .page:before {
        content: counter(page, decimal);
    }

    #footer .page:after {
        counter-increment: counter(page, decimal);
    }


    @page {
        margin: 20px 30px 40px 50px;
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
        text-align: left;
    }

    tr:nth-child(even) {
        /* background-color: #eeeeee; */
        border: 1px solid #eeeeee;
    }

    th {
        font-size: 9px;

    }

    td {
        font-size: 9px;
    }

    footer {
        bottom: 0px;
        position: absolute;
        width: 100%;
    }

    /* .page-break {
        page-break-after: always;
    } */

    .main-table {
        padding-bottom: 20px;
        padding-top: 10px;
        padding-right: 15px;
        padding-left: 15px;
    }

    .footer-main-table {
        padding-bottom: 7px;
        padding-top: 0px;
        padding-right: 15px;
        padding-left: 15px;
    }

    hr {
        position: relative;
        border: none;
        height: 2px;
        background: #c5c2c2;
        padding: 0px
    }

    .title-font {
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 14px;
        font-weight: bold
    }

    .summary-header th {
        font-size: 10px
    }

    .summary-table td {
        font-size: 9px
    }
</style>

</html>