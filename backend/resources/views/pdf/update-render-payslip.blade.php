<!DOCTYPE html>
<html>

<head>
    <style>
        .table-container {
            display: flex;
        }

        .table-container table {
            flex: 1;
            margin-right: 10px;
            /* Optional: Add some spacing between the tables */
        }

        * {
            padding: 0;
            margin: 0;
        }

        body {
            font-family: Arial, sans-serif;
        }

        table {
            width: 100%;
            border-collapse: collapse;

        }

        th,
        td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        th {
            background-color: #f2f2f2;
        }

        .payslip-title {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
        }
    </style>
</head>

<body>




    <table>
        <tr>
            <td style="width: 40%; text-align: right; border:none;">
                <h1 class="payslip-title"><u>PAYSLIP</u></h1>
            </td>

        </tr>
    </table>
    <table>
        <tr>
            <td style="width: 8%; border:none;">
                <img style="border-radius: 10%; " width="100" height="100"
                    src="https://th.bing.com/th/id/R.b4e3fb857db675de7df59ab6f4cf30ab?rik=gbQLvTh9DaC6tQ&pid=ImgRaw&r=0"
                    alt="">
            </td>
            <td style="width: 30%; border:none; ">
                <p>AKIL SECURITY AND ALARM SYSTEM</p>
                <small>Bur Dubai, United Arab Emirates</small>
            </td>

            <td style="width: 40%; text-align: right; border:none;">
                <p>Payslip No: # 987654</p>
                <p>Date: June 30, 2023</p>
            </td>
        </tr>
    </table>

    <br>

    {{-- <table>
       
        <tr>
            <td>Employee ID:</td>
            <td>123456</td>
        </tr>
        <tr>
            <td>Department:</td>
            <td>Finance</td>
        </tr>
        <tr>
            <td>Position:</td>
            <td>Accountant</td>
        </tr>
    </table> --}}

    <div class="container">
        <table style="padding: 20px;">
            <tr>
                <th style="width:25%;">Employee Name:</th>
                <th style="width:25%; text-align: right;">John Doe</th>
            </tr>

            <tr>
                <td>Basic Salary</td>
                <td style="text-align: right;border-right:1px solid gray">$5,000</td>
            </tr>
            <tr>
                <td>Overtime</td>
                <td style="text-align: right;border-right:1px solid gray">$500</td>
            </tr>
            <tr>
                <td>Bonuses</td>
                <td style="text-align: right;border-right:1px solid gray">$1,000</td>
            </tr>

        </table>

        <table style="padding: 20px;">
            <tr>
                <th style="width:25%;">Employee Name:</th>
                <th style="width:25%; text-align: right;">John Doe</th>
            </tr>

            <tr>
                <td>Basic Salary</td>
                <td style="text-align: right;border-right:1px solid gray">$5,000</td>
            </tr>
            <tr>
                <td>Overtime</td>
                <td style="text-align: right;border-right:1px solid gray">$500</td>
            </tr>
            <tr>
                <td>Bonuses</td>
                <td style="text-align: right;border-right:1px solid gray">$1,000</td>
            </tr>

        </table>
    </div>


    <table style="padding: 20px;">
        <tr>
            <th style="width:25%;">Earnings</th>
            <th style="width:25%; text-align: right;border-right:1px solid gray;">Amount</th>
            <th style="width:25%;">Deductions</th>
            <th style="width:25%; text-align: right">Amount</th>
        </tr>

        <tr>
            <td>Basic Salary</td>
            <td style="text-align: right;border-right:1px solid gray">$5,000</td>
            <td>Tax</td>
            <td style="text-align: right">$750</td>
        </tr>
        <tr>
            <td>Overtime</td>
            <td style="text-align: right;border-right:1px solid gray">$500</td>
            <td>Health Insurance</td>
            <td style="text-align: right">$150</td>
        </tr>
        <tr>
            <td>Bonuses</td>
            <td style="text-align: right;border-right:1px solid gray">$1,000</td>
            <td></td>
            <td style="text-align: right"></td>
        </tr>
        <tr>
            <th>Total Earnings</th>
            <th style="text-align: right;border-right:1px solid gray">$1,000</th>
            <th>Total Deductions</th>
            <th style="text-align: right">$1,000</th>
        </tr>

    </table>
    <table style="padding: 20px;">
        <tr>
            <td style="border-top: 1px solid #ddd;"><strong>Total Net Salary : $5,400</strong></td>
        </tr>
    </table>

</body>

</html>
