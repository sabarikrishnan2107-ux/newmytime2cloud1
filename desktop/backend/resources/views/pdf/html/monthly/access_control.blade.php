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

        /* .page-break {
            page-break-after: always;
        } */

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

<body>
    <table style="margin-top: -20px !important;backgroundd-color:blue;padding-bottom:0px ">
        <tr>
            <td style="text-align: left;width: 300px; border :none; padding:15px;   backgrozund-color: red">
                <div style=";">
                    <img src="{{ getcwd() . '/upload/app-logo.jpeg' }}" height="70px" width="200">
                </div>
            </td>
            <td style="text-align: left;width: 333px; border :none; padding:15px; backgrozusnd-color:blue">
                <div>
                    <table style="text-align: left; border :none;  ">
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: center; border :none">
                                <span class="title-font">
                                    Monthly Access Control Report
                                </span>
                                <hr style="width: 230px">
                            </td>
                        </tr>
                        <tr style="text-align: left; border :none;">
                            <td style="text-align: center; border :none">
                                <span style="font-size: 11px">
                                    01 Sep 2023 - 30 Sep 2023
                                </span>
                                <hr style="width: 230px">
                            </td>
                        </tr>
                    </table>
                </div>
            </td>
            <td style="text-align: right;width: 300px; border :none; backgrounsd-color: red">


                <table class="summary-table"
                    style="border:none; padding:0px 50px; margin-left:35px;margin-top:20px;margin-bottom:0px">
                    <tr style="text-align: left; border :none;">
                        <td style="text-align: right; border :none;font-size:10px">
                            <b>
                                Akkil Security & Alarm System LLC
                            </b>
                            <br>
                        </td>
                    </tr>
                    <tr style="text-align: left; border :none;">
                        <td style="text-align: right; border :none;font-size:10px">
                            <span style="margin-right: 3px"> P.O. Box 83481, Dubai </span>
                            <br>
                        </td>
                    </tr>
                    <tr style="text-align: left; border :none;">
                        <td style="text-align: right; border :none;font-size:10px">
                            <span style="margin-right: 3px"> United Arab Emirates </span>
                            <br>
                        </td>
                    </tr>
                    <tr style="text-align: left; border :none;">
                        <td style="text-align: right; border :none;font-size:10px">
                            <span style="margin-right: 3px"> Tel: +97143939562 </span>
                            <br>
                        </td>
                    </tr>
                </table>

                <br>
            </td>
            </td>
        </tr>
    </table>
    @php
        $names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Helen', 'Ivy', 'Jack', 'Katie', 'Liam', 'Mia', 'Noah', 'Olivia', 'Parker', 'Quinn', 'Ryan', 'Sophia', 'Tyler', 'Uma', 'Victoria', 'William', 'Xander', 'Yara', 'Zoe'];
        $devices = ['EGC Dubai', 'SPT Dubai', 'DMH Dubai', 'GSD Dubai', 'POH Dubai', 'MVT Dubai'];
        $locations = ['Emirates Gateway Center, Dubai', 'Skyline Plaza Tower, Dubai', 'Desert Mirage Hub, Dubai', 'Golden Sands District, Dubai', 'PalmTech Oasis Hub, Dubai', 'MetroView Tower, Dubai'];
        $LogTime = ['---', '00:30', '00:45', '00:15', '00:17', '00:17', '01:30'];
        $days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
        
    @endphp

    @for ($j = 1; $j <= 10; $j++)
        @php
            shuffle($names);
        @endphp

        <table style="margin-top: 5px !important;">
            <tr style="text-align: left; border :1px solid black; width:120px;">
                <td style="text-align: left;"><b>Name</b>: {{ $names[0] }}</td>
                <td style="text-align: left;"><b>EID</b>: 000111</td>
                <td style="text-align: left;"><b>Dept</b>: Sales</td>
                <td style="text-align: left; width:120px;"><b>Date: </b> 1 Sep</td>
                {{-- <td style="text-align: left; color: green;">
                <b>Present</b>: 14
            </td>
            <td style="text-align: left; color: red;">
                <b>Absent</b>: 14
            </td>
            <td style="text-align: left; color: rgb(209, 139, 9);">
                <b>Late</b>: 14
            </td> --}}
            </tr>
        </table>

        <table style="margin-top: 5px !important; margin-bottom: 15px !important; ">

            <tr style="background-colors: #A6A6A6;">
                <td style="text-align: center;"> LogTime </td>
                <td style="text-align: center;"> Device</td>
                <td style="text-align: center;"> Location</td>
            </tr>

            @for ($i = 1; $i <= 10; $i++)
                @php
                    shuffle($locations);
                    shuffle($devices);
                    shuffle($LogTime);
                @endphp
                <tr style="background-colors: #A6A6A6;">
                    <td style="text-align: center;"> {{ $LogTime[0] }}</td>
                    <td style="text-align: center;"> {{ $devices[0] }}</td>
                    <td style="text-align: center;"> {{ $locations[0] }}</td>
                </tr>
            @endfor


        </table>
    @endfor

    <hr style=" bottom: 0px; position: absolute; width: 100%; margin-bottom:40px">
    <footer style="padding-top: 100px!important">
        <table class="main-table">
            <tr style="border :none">
                <td style="text-align: right;border :none">
                    <b>Powered by</b>: <span style="color:blue"> www.ideahrms.com</span> Printed on :
                    {{ date('d-M-Y ') }}
                </td>
            </tr>
        </table>
    </footer>

</body>

</html>
