<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

<body>
    <table style="margin-top: -20px !important;backgroundd-color:blue;padding-bottom:0px ">
        <tr>
            <td style="text-align: left;width: 300px; border :none; padding:15px;   backgrozund-color: red">
                <div class="row">
                    <div class="col-5">
                        @if (env('APP_ENV') !== 'local')
                        <img src="{{ $company->logo }}" style=" width:100px;max-width:150px;margin: 0px 0px 0px 0px; ">
                        @else
                        <img src="{{ getcwd() .   '/'.$company->logo_raw }}" style=" width:100px;max-width:150px;margin: 0px 0px 0px 0px; ">
                        @endif
                    </div>
                    <div class="col-7" style="background-coldor: rgb(253, 246, 246);padding:0px;margin:0px 5px">
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
    </table> --}}
    </div>

    </div>
    </td>
    <td style="text-align: left;width: 333px; border :none; padding:15px; backgrozusnd-color:blue">
        <div>
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
    <td style="text-align: right;width: 300px; border :none; backgrounsd-color: red">
        <table class="summary-table" style="border:none; padding:0px 50px; margin-left:35px;margin-top:20px;margin-bottom:0px">
            <tr style="border: none">
                <th style="text-align: center; border :none;padding:10px;font-size: 12px " colspan="3">
                    <hr style="width: 200px">
                    Total Number of Employees : {{ count($data) }}
                </th>
            </tr>
            <tr class="summary-header" style="border: none;background-color:#eeeeee">
                <th style="text-align: center; border :none; padding:5px">Present</th>
                <th style="text-align: center; border :none">Absent</th>
                <th style="text-align: center; border :none">Leave</th>
            </tr>
            <tr style="border: none">
                <td style="text-align: center; border :none; padding:5px;color:green">
                    {{ $info->total_present }}
                </td>
                <td style="text-align: center; border :none;color:red">{{ $info->total_absent ?? 0 }}</td>
                <td style="text-align: center; border :none;color:red">{{ $info->total_leave ?? 0 }}</td>
            </tr>
            <tr class="summary-header" style="border: none;background-color:#eeeeee ">
                <th style="text-align: center; border :none; padding:5px">Late</th>
                <th style="text-align: center; border :none">Early</th>
                <th style="text-align: center; border :none">Missing</th>
            </tr>
            <tr style="border: none">
                <td style="text-align: center; border :none; padding:5px;color:red">
                    {{ $info->total_late ?? 0 }}
                </td>
                <td style="text-align: center; border :none;color:green">{{ $info->total_early ?? 0 }}</td>
                <td style="text-align: center; border :none;color:orange">{{ $info->total_missing ?? 0 }}</td>
            </tr>
            <tr style="border: none">
                <th style="text-align: center; border :none" colspan="3">
                    <hr style="width: 200px">
                </th>
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
                <div id="pageNumbers" style="margin:10px!important">
                    <div class="page-number" style="font-size: 9px;margin-top:-30px!important"></div>
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
                <td style="text-align:  left;width:3px"> # </td>
                <td style="text-align:  left;width:10px"> Name </td>
                <td style="text-align:  center;width:50px"> EID </td>
                <td style="text-align:  center;width:80px"> Roaster </td>

                <td style="text-align:  center;width:20px"> In1 </td>
                <td style="text-align:  center;width:20px"> Out1 </td>

                <td style="text-align:  center;width:20px"> In2 </td>
                <td style="text-align:  center;width:20px"> Out2 </td>

                <td style="text-align:  center;width:20px"> In3 </td>
                <td style="text-align:  center;width:20px"> Out3 </td>

                <td style="text-align:  center;width:20px"> In4 </td>
                <td style="text-align:  center;width:20px"> Out4 </td>

                <td style="text-align:  center;width:20px"> In5 </td>
                <td style="text-align:  center;width:20px"> Out5 </td>

                <td style="text-align:  center;width:20px"> In6 </td>
                <td style="text-align:  center;width:20px"> Out6 </td>

                <td style="text-align:  center;width:20px"> In7 </td>
                <td style="text-align:  center;width:20px"> Out7 </td>

                <td style="text-align:  center;width:40px"> Total Hours </td>
                <td style="text-align:  center;width:40px"> OT </td>
                <td style="text-align:  center;width:40px"> Status </td>
            </tr>

            @foreach ($data as $data)
            @php
            if ($data->status == 'P') {
            $statusColor = 'green';
            } elseif ($data->status == 'A') {
            $statusColor = 'red';
            } elseif ($data->status == 'M') {
            $statusColor = 'orange';
            } elseif ($data->status == '---') {
            $statusColor = '#f34100ed';
            }
            // ld($arr);
            // die;

            // $time1 = strtotime($data->in);
            // $time2 = strtotime($data->AttendanceLogs[1]->time);
            // $difference = round(abs($time2 - $time1) / 3600, 2);
            @endphp
            <tbody>
                <tr style="text-align:  center;">
                    <td>{{ ++$i }}</td>
                    <td style="text-align:  left; width:70px">
                        {{ implode(' ', array_slice(explode(' ', $data->employee->display_name), 0, 2)) ?? '---' }}
                    </td>
                    <td style="text-align:  center;">{{ $data->employee_id ?? '---' }}</td>
                    <td style="text-align:  center;"> {{ $data->roster->name ?? '---' }} </td>

                    <td style="text-align:  center;"> {{ $data->logs[0]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[0]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[1]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[1]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[2]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[2]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[3]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[3]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[4]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[4]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[5]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[5]['out'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[6]['in'] ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->logs[6]['out'] ?? '---' }} </td>

                    <td style="text-align:  center;"> {{ $data->total_hrs ?? '---' }} </td>
                    <td style="text-align:  center;"> {{ $data->ot ?? '---' }} </td>
                    <td style="text-align:  center; color:{{ $statusColor }}"> {{ $data->status ?? '---' }} </td>
                </tr>
            </tbody>
            @endforeach

            @php

            @endphp

        </table>


</body>
{{-- <style>
    .pageCounter span {
        counter-increment: pageTotal;
    }

    #pageNumbers div:before {
        counter-increment: currentPage;
        content: "Page "counter(currentPage) " of ";
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
</style> --}}

<style>
    .my-break {
        page-break-after: always;
        /* background-color: red !important; */
    }

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
        margin: 10px 30px 25px 50px;
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

    /* --------------------------- */

    .m-1 {
        margin: 0.25rem;
    }

    .m-2 {
        margin: 0.5rem;
    }

    .m-3 {
        margin: 1rem;
    }

    .mt-2 {
        margin-top: 0.5rem;
    }

    .mt-3 {
        margin-top: 1rem;
    }

    .mr-1 {
        margin-right: 0.25rem;
    }

    .ml-3 {
        margin-left: 1rem;
    }

    .mx-4 {
        margin-right: 1.5rem;
        margin-left: 1.5rem;
    }

    .my-5 {
        margin-top: 2.5rem;
        margin-bottom: 2.5rem;
    }

    .pr-1 {
        padding-right: 0.25rem;
    }

    .pt-2 {
        padding-top: 0.5rem;
    }

    .pl-3 {
        padding-left: 1rem;
    }

    .px-4 {
        padding-right: 1.5rem;
        padding-left: 1.5rem;
    }

    .py-5 {
        padding-top: 2.5rem;
        padding-bottom: 2.5rem;
    }

    .row::after {
        content: "";
        clear: both;
        display: table;
    }

    .col {
        width: 5%;
        float: left;
        padding: 5px;
    }


    .col-1 {
        width: 8.33%;
        float: left;
        padding: 5px;
    }

    .col-2 {
        width: 16.66%;
        float: left;
        padding: 5px;
    }

    .col-3 {
        width: 24.99%;
        float: left;
        padding: 5px;
    }

    .col-4 {
        width: 33.32%;
        float: left;
        padding: 5px;
    }

    .col-5 {
        width: 41.65%;
        float: left;
        padding: 5px;
    }

    .col-6 {
        width: 49.98%;
        float: left;
        padding: 5px;
    }

    .col-7 {
        width: 58.31%;
        float: left;
        padding: 5px;
    }

    .col-8 {
        width: 66.64%;
        float: left;
        padding: 5px;
    }

    .col-9 {
        width: 74.97%;
        float: left;
        padding: 5px;
    }

    .col-10 {
        width: 83.3%;
        float: left;
        padding: 5px;
    }

    .col-11 {
        width: 91.63%;
        float: left;
        padding: 5px;
    }

    .col-12 {
        width: 100%;
        float: left;
        padding: 5px;
    }

    .form-input {
        width: 100%;
        padding: 2px 5px;
        border-radius: 0px;
        resize: vertical;
        outline: 0;
    }
</style>


</html>