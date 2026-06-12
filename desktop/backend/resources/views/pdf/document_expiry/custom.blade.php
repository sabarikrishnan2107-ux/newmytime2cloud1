{{-- @php
phpinfo();
die();
@endphp --}}
<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

<head>



    <style>
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

        .page-break {
            page-break-after: always;
        }

        .main-table {
            padding-bottom: 20px;
            padding-top: 10px;
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
</head>
@php
$totPresent = [];
$totAbsent = [];
$totMissing = [];
@endphp

<body>


    <table style="margin-top: -20px !important;backgroundd-color:blue;padding-bottom:0px ">
        <tr>
            <td style="text-align: left;width: 300px; border :none; padding:15px;">
            </td>
            <td style="text-align: left;width: 333px; border :none; padding:15px; backgrozusnd-color:blue">
                {{-- <img src="{{ $company->logo }}" style=" width:100px;max-width:150px;margin: 0px 0px 0px 0px; "> --}}

                <div class="col-12" style="text-align:center">
                    @if (env('APP_ENV') !== 'local')
                    <img src="{{ $company->logo }}" style=" width:100px;max-width:150px;margin: 0px 0px 0px 0px; ">
                    @else
                    <img src="{{ getcwd() .   '/'.$company->logo_raw }}" style=" width:100px;max-width:150px;margin: 0px 0px 0px 0px; ">
                    @endif

                </div>

                <div>
                    <table style="text-align: left; border :none;  ">
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: center; border :none">
                                <span class="title-font">
                                    {{ 'Document Expiry' }}
                                </span>
                                <hr style="width: 230px">
                            </td>
                        </tr>
                        <tr style="text-align: left; border :none;">
                            {{-- <td style="text-align: center; border :none">
                                <span style="font-size: 11px">
                                    {{ date('d-M-y', strtotime($params['from_date'])) }} -
                            {{ date('d-M-y', strtotime($params['to_date'])) }}

                            </span>
                            <hr style="width: 230px">
            </td>
        </tr> --}}
    </table>
    </div>
    </td>
    <td style="text-align: right;width: 300px; border :none;">
    </td>
    </td>
    </tr>
    </table>
    <table class="main-table">
        <thead>
            <th style="text-align:center;width:80px"> Branch </th>
            <th style="text-align:;"> Employee </th>
            <th style="text-align:center;width:80px"> Phone Number </th>
            <th style="text-align:center;width:150px"> Email </th>
            <th style="text-align:;width:150px"> Document </th>
        </thead>

        @foreach ($data as $row)
        <tbody>
            <tr>
                <td style="text-align:  center;">
                    {{ $row['branch']['branch_name'] ?? '---' }}
                </td>
                <td style="text-align:; width:120px;">
                    @php
                    // $pic = 'https://i.pinimg.com/originals/df/5f/5b/df5f5b1b174a2b4b6026cc6c8f9395c1.jpg';
                    $pic = getcwd() . '/media/employee/profile_picture/' . $row['profile_picture_raw'];

                    @endphp
                    <div style="padding:5px; height: 30px;">
                        <img style="border-radius: 50%;width: 30px;float:left" src="{{ $pic }}" />
                        <br>
                        <b style="margin-left:5px; padding-top:15px;">
                            {{ $row['first_name'] ?? '---' }} {{ $row['last_name'] ?? '---' }}
                        </b>
                        <br>
                        <small style="margin-left:5px;">{{ $row['employee_id'] ?? '---' }}</small>
                    </div>
                </td>

                <td style="text-align:  center;">
                    {{ $row['phone_number'] ?? '---' }}
                </td>

                <td style="text-align:  center;">
                    {{ $row['user']['email'] ?? '---' }}
                </td>

                <td style="text-align:;">
                    @if ($row['passport'])
                    <div>
                        <b>Passport</b>{{ $row['passport']['expiry_date'] ?? '---' }}
                    </div>
                    @endif

                    @if ($row['emirate'])
                    <div>
                        <b>Emirates Id</b> {{ $row['emirate']['expiry'] ?? '---' }}
                    </div>
                    @endif

                    @if ($row['visa'])
                    <div>
                        <b>Emirates Id</b> {{ $row['visa']['expiry_date'] ?? '---' }}
                    </div>
                    @endif
                </td>
            </tr>
        </tbody>
        @endforeach


    </table>

    <hr style=" bottom: 0px; position: absolute; width: 100%; margin-bottom:40px">
    <footer style="padding-top: 100px!important">
        <table class="main-table">
            <tr style="border :none">
                {{-- <td style="text-align: left;border :none"><b>Device</b>: Main Entrance = MED, Back Entrance =
                    BED
                </td>
                <td style="text-align: left;border :none"><b>Shift Type</b>: Manual = MA, Auto = AU, NO = NO
                </td>
                <td style="text-align: left;border :none"><b>Shift</b>: Morning = Mor, Evening = Eve, Evening2 =
                    Eve2
                </td> --}}
                <td style="text-align: right;border :none;">
                    <b>Powered by</b>: <span style="color:blue"> www.mytime2cloud.com</span>
                </td>
                <td style="text-align: right;border :none">
                    Printed on : {{ date('d-M-Y ') }}
                </td>
            </tr>
        </table>
    </footer>
</body>

</html>