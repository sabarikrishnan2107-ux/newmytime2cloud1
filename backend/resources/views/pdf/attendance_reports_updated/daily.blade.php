<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

<body>
    <table style="margin-top: -20px !important;backgroundd-color:blue;padding-bottom:0px ">
        <tr>
            <td style="border: nonse" colspan="6">
                <div class="row">

                    <!-- Template1 Report -->

                    <div class="col-12" style="background-coldor: rgb(253, 246, 246);padding:0px;margin:0px 5px">
                        <table style="padding:0px;margin:0px">
                            <tr style="text-align: left; border :none; padding:100px 0px;">
                                <td style="text-align: left; border :none;font-size:12px;padding:0 0 5px 0px;">
                                    <b style="padding:0px;margin:0px">
                                        {{ $company->name }}
                                    </b>
                                    <br>
                                </td>
                            </tr>
                            <tr style="text-align: left; border :none;padding:10px 0px">
                                <td style="text-align: left; border :none;font-size:10px;padding:5px 0px;">
                                    <span style="margin-left: 3px">P.O.Box
                                        {{ $company->p_o_box_no == 'null' ? '---' : $company->p_o_box_no }}</span>
                                    <br>
                                </td>
                            </tr>
                            <tr style="text-align: left; border :none;padding:10px 0px">
                                <td style="text-align: left; border :none;font-size:10px;padding:5px 0px">
                                    <span style="margin-left: 3px">{{ $company->location }}</span>
                                    <br>
                                </td>
                            </tr>
                            <tr style="text-align: left; border :none;padding:10px 0px">
                                <td style="text-align: left; border :none;font-size:10px;padding:5px 0px">
                                    <span style="margin-left: 3px">{{ $company->contact->number ?? '' }}</span>
                                    <br>
                                </td>
                            </tr>
                            <tr style="text-align: left; border :none;padding:10px 0px">
                                <td style="text-align: left; border :none;font-size:10px;padding:7px 0px">
                                    <span style="margin-left: 3px">{{ '' }}</span>
                                    <br>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </td>
            <td style="text-align: left;width: 333px; border :none; padding:15px; backgrozusnd-color:blue">
                <div class="col-12" style="text-align:center;height:85px;  ">

                    @if (env('APP_ENV') !== 'local')
                    <img src="{{ $company->logo }}" style=" width:100px;max-width:150px;margin: 0px 0px 0px 0px; ">
                    @else
                    <img src="{{ getcwd() .   '/'.$company->logo_raw }}" style=" width:100px;max-width:150px;margin: 0px 0px 0px 0px; ">
                    @endif
                </div>
                <div style="clear:both">
                    <table style="text-align: left; border :none;  ">
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: center; border :none">
                                <span class="title-font">
                                    Daily Attendance {{ $info->report_type }} Report
                                </span>
                                <hr style="width: 230px">
                            </td>
                        </tr>
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: center; border :none">
                                <span style="font-size: 11px">
                                    {{ date('d M Y', strtotime($info->daily_date)) }}<br>
                                    {{-- <small>Department : {{ $info->department_name }}</small> --}}
                                </span>
                                <hr style="width: 230px">
                            </td>
                        </tr>
                    </table>
                </div>
            </td>
            <td style="text-align: right; border :none; backgrounsd-color: red">
                <table class="summary-table">
                    <tr style="border: none">
                        <th style="text-align: center; border :none;padding:10px;font-size: 12px " colspan="3">

                            Total Number of Employees : {{ count($data) }}
                        </th>
                    </tr>
                    <tr class="summary-header" style="border: none;background-color:#eeeeee">
                        <th style="text-align: center; border :none; padding:5px">Present</th>

                        <th style="text-align: center; border :none">Absent</th>

                        <th style="text-align: center; border :none">Leaves</th>
                        <th style="text-align: center; border :none"> Week Off</th>
                    </tr>
                    <tr style="border: none">
                        <td style="text-align: center; border :none; padding:5px;color:green">
                            {{ $info->total_present }}
                        </td>
                        <td style="text-align: center; border :none;color:red">{{ $info->total_absent ?? 0 }}</td>
                        <td style="text-align: center; border :none;color:red">{{ $info->total_leave ?? 0 }}</td>
                        <td style="text-align: center; border :none;color:red">{{ $info->total_weekoff ?? 0 }}</td>
                    </tr>
                    <tr class="summary-header" style="border: none;background-color:#eeeeee ">
                        <th style="text-align: center; border :none; padding:5px">Late</th>
                        <th style="text-align: center; border :none">Early</th>
                        <th style="text-align: center; border :none">Missing</th>
                        <th style="text-align: center; border :none">Holidays</th>

                    </tr>
                    <tr style="border: none">
                        <td style="text-align: center; border :none; padding:5px;color:red">
                            {{ $info->total_late ?? 0 }}
                        </td>
                        <td style="text-align: center; border :none;color:green">{{ $info->total_early ?? 0 }}</td>
                        <td style="text-align: center; border :none;color:orange">{{ $info->total_missing ?? 0 }}</td>
                        <td style="text-align: center; border :none;color:orange">{{ $info->total_holiday ?? 0 }}</td>

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
                            <a href="{{env('APP_URL')}}" target="_blank">{{env('APP_NAME')}}</a>
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
        <table class="main-table">
            <tr style="text-align: left;font-weight:bold">
                <td style="text-align:  left;width:30px"> # </td>
                <td style="text-align:  left;width:120px"> Name </td>
                <td style="text-align:  center;width:60px"> EID </td>
                <td style="text-align:  center;width:80px"> Shift </td>
                <td style="text-align:  center;width:80px"> Shift Type </td>
                <td style="text-align:  center;width:40px"> In </td>
                <td style="text-align:  center;width:40px"> Out </td>
                <td style="text-align:  center;width:40px"> Total Hours </td>
                <td style="text-align:  center;width:40px"> OT </td>
                <td style="text-align:  center;width:40px"> Status </td>
                <td style="text-align:  center;width:50px"> Device In </td>
                <td style="text-align:  center;width:50px"> Device Out </td>
            </tr>
            @foreach ($data as $data)
            {{-- @dd($data) --}}
            @php
            if ($data->status == 'P') {
            $statusColor = 'green';
            } elseif ($data->status == 'A') {
            $statusColor = 'red';
            } elseif ($data->status == 'M') {
            $statusColor = 'orange';
            } elseif ($data->status == 'O') {
            $statusColor = 'gray';
            } elseif ($data->status == '---') {
            $statusColor = '#f34100ed';
            }
            @endphp
            <tbody>
                <tr style="text-align:  center;">
                    <td>{{ ++$i }}</td>
                    <td style="text-align:  left; width:120px">{{ $data->employee->display_name ?? '---' }}</td>
                    <td style="text-align:  center;">{{ $data->employee_id ?? '---' }}</td>
                    <td style="text-align:  center;"> {{ $data->shift->name ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->shift_type->name ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->in ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->out ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->total_hrs ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->ot ?? '---' }} </td>
                    <td style="text-align:  center; color:{{ $statusColor }}"> {{ $data->status ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->device_in->short_name ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->device_out->short_name ?? '---' }} </td>
                </tr>
            </tbody>
            @endforeach
        </table>


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
        font-size: 7px;
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