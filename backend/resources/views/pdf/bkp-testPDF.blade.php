<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Three Columns Layout</title>
    <style>
        * {
            padding: 0px;
            margin: 0;
            font-family: "Open Sans", sans-serif;
            font-size: 9pt;
            color: #777777;
        }

        body {
            margin: 50px 15px;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        th,
        td {
            border: 1px solid #dddddd;
            padding: 3px;
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
    </style>
</head>

<body>
    <table>
        <tr>
            <td class="text-left border-none col-4">
                <div class="logo pt">
                    <img style="width: 100%" src="https://amc.mytime2cloud.com/mail-logo.png" alt="Company Logo" />
                </div>
            </td>
            <td class="text-center border-none col-4 uppercase">
                <div>
                    <b>Access Denied Control Report</b>
                    <div class="border-top border-bottom">
                        01 JAN 2024 TO 05 JAN 2024
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
        <tr>
            <td>1</td>
            <td>John Doe</td>
            <td>123-456-7890</td>
            <td>101</td>
            <td>2024-01-25 08:00:00</td>
            <td>08:00 AM</td>
            <td>05:00 PM</td>
            <td>Entry</td>
            <td>Present</td>
            <td>Employee</td>
        </tr>
    </table>
</body>

</html>
