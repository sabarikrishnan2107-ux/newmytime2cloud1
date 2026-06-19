<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Community Report</title>
    <style>
        * {
            padding: 0px;
            margin: 0;
            font-family: "Open Sans", sans-serif;
            font-size: 9pt;
            color: #777777;
        }

        body {
            margin: 25px 25px 0 25px;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        th,
        td {
            border: 1px solid #dddddd;
            padding: 4px;
            text-align: left;
        }

        .text-left {
            text-align: left;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .logo {
            max-width: 150px;
            height: auto;
        }

        .red {
            background-color: red;
        }

        .green {
            background-color: green;
        }

        .blue {
            background-color: blue;
        }

        .col-1 {
            width: 8.3%;
        }

        .col-2 {
            width: 16.6%;
        }

        .col-3 {
            width: 24.9%;
        }

        .col-4 {
            width: 33.2%;
        }

        .uppercase {
            text-transform: uppercase;
        }

        .border-top {
            border-top: 1px solid #dddddd;
            /* Add top border */
        }

        .border-bottom {
            border-bottom: 1px solid #dddddd;
            /* Add top border */
        }

        .border-none {
            border: none;
            /* Add top border */
        }

        .mt-1 {
            margin-top: 5px;
            /* Add top border */
        }

        .mt-2 {
            margin-top: 10px;
            /* Add top border */
        }

        .mt-3 {
            margin-top: 15px;
            /* Add top border */
        }

        .mt-4 {
            margin-top: 20px;
            /* Add top border */
        }

        .mt-5 {
            margin-top: 25px;
            /* Add top border */
        }

        .page-break {
            page-break-after: always;
        }

        footer {
            position: fixed;
            right: 0px;
            bottom: 10px;
            text-align: center;
            counter-reset: pageTotal;
            width: 100%;

        }

        .circle-container {
            text-align: left;
        }

        .circle-container img {
            border-radius: 50%;
            max-width: 100%;
            vertical-align: middle;
            /* Adjust as needed for spacing */
        }

        footer .page:before {
            content: counter(page, decimal);
        }

        footer .page:after {
            counter-increment: counter(page, decimal);
        }

        .pageCounter span {
            counter-increment: pageTotal;
        }

        #pageNumbers span:before {
            counter-increment: currentPage;
            content: "Page " counter(currentPage) "/";
        }
    </style>
</head>

<body>
    <div>

        @foreach ($chunks as $chunk)
            <div id="footer">
                <div class="pageCounter">
                    <p></p>
                    @php
                        $p = count($chunks);
                        if ($p <= 1) {
                            echo '<span></span>';
                        } else {
                            for ($a = 1; $a <= $p; $a++) {
                                echo '<span></span>';
                            }
                    } @endphp
                </div>

            </div>
            <table>
                <tr>
                    <td class="text-left border-none col-4">
                        <div class="logo pt">
                            <img style="width: 100%" src="https://amc.mytime2cloud.com/mail-logo.png"
                                alt="Company Logo" />
                        </div>
                    </td>
                    <td class="text-center border-none col-4 uppercase">
                        <div>
                            <b>{{ $params['report_type'] ?? 'Access Control Report' }} </b>
                            <div class="border-top border-bottom">
                                {{ date('d-M-Y', strtotime($params['from_date'])) }} TO
                                {{ date('d-M-Y', strtotime($params['to_date'])) }}

                            </div>
                        </div>
                    </td>
                    <td class="text-right border-none col-4">
                        <div class="company-info">
                            <h3>AKIL SECURITY AND ALARM SYSTEMS</h3>
                            <p>DUBAI - UNITED ARAB EMIRATES</p>
                            <p>+971 4 3939 562, INFO@AKILGROUP.COM</p>
                        </div>
                    </td>
                </tr>
            </table>
            <table class="mt-5">
                <tr>
                    <th>S.NO</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Door</th>
                    <th>DateTime</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>User Type</th>
                </tr>
                @foreach ($chunk as $key => $data)
                    <tr>
                        <td style="width:10px;">{{ $key + 1 }}</td>

                        <td>
                            @php
                                $pic = 'https://i.pinimg.com/originals/df/5f/5b/df5f5b1b174a2b4b6026cc6c8f9395c1.jpg';

                                if ($data['tanent'] && $data['tanent']['profile_picture']) {
                                    $pic = getcwd() . '/community/profile_picture/' . $data['tanent']['profile_picture_name'];
                                } else {
                                    $pic = getcwd() . '/community/profile_picture/' . $data['member']['profile_picture_name'];
                                }

                            @endphp

                            <table>
                                <tr>
                                    <td style="width:20px;" class="border-none">

                                        <img alt="{{ $pic }}"
                                            style="border-radius: 50%;width:40px;height:40px;padding-top:5px;"src="{{ $pic }}" />
                                    </td>
                                    <td class="border-none">
                                        <b style="margin-left:5px; padding-top:-30px;">
                                            {{ $data['tanent']['full_name'] ?? $data['member']['full_name'] }}
                                        </b>
                                        <br>
                                        <small style="margin-left:5px;">
                                            EID:{{ $data['tanent']['system_user_id'] ?? $data['member']['system_user_id'] }}
                                        </small>
                                    </td>
                                </tr>
                            </table>
                        </td>
                        <td>{{ $data['tanent']['phone_number'] ?? $data['member']['phone_number'] }}</td>
                        <td>{{ $data['device']['location'] ?? '---' }}</td>
                        <td>{{ $data['date'] }} {{ $data['time'] }}</td>
                        <td>
                            {{ strtolower($data['device']['function']) !== 'out' ? 'In' : '---' }}
                        </td>
                        <td>
                            {{ strtolower($data['device']['function']) == 'out' ? 'Out' : '---' }}
                        </td>
                        </td>
                        <td>{{ $data['device']['mode'] ?? '---' }}</td>
                        <td>{{ $data['status'] }}</td>
                        <td>{{ $data['tanent'] ? "Tanent" : "Member" }}</td>
                    </tr>
                @endforeach
            </table>
            <footer class="page page-break">

                <hr class="mt-1" style="color:#dddddd;">
                <table>
                    <tr>
                        <td class="text-left border-none col-4">
                            <div>
                                Printed On {{ date('d M Y') }}
                            </div>
                        </td>
                        <td class="text-center border-none col-4 ">
                            <div>
                                This is system generated report
                            </div>
                        </td>
                        <td class="text-right border-none col-4">
                            <div id="pageNumbers" class="company-info">
                                <span class="page-number"></span>
                                {{ count($chunks) }}
                            </div>
                        </td>
                    </tr>
                </table>
            </footer>
        @endforeach
    </div>
</body>

</html>
