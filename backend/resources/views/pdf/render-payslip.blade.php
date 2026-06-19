<!DOCTYPE html>
<html>

<head>
    <style>
        body {
            padding: 0;
            margin: 0;
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


        .table-container {
            display: table;
            width: 100%;
        }

        .table-cell {
            display: table-cell;
        }

        .gap {
            width: 2%;
        }
    </style>
</head>

<body>
    <div class="table-container">
        <div class="table-cell" style="width:33%;">
            @if (env('APP_ENV') !== 'local')
                <img src="{{ $data->company->logo }}" style="border-radius: 10%; " width="100" height="100">
            @else
                <img src="https://th.bing.com/th/id/R.b4e3fb857db675de7df59ab6f4cf30ab?rik=gbQLvTh9DaC6tQ&pid=ImgRaw&r=0"
                    style="border-radius: 10%; " width="100" height="100">
            @endif


            <p>{{ $data->company->name }}</p>
            <small>{{ $data->company->location }}</small>

        </div>
        <div class="table-cell" style="width:34%; text-align:center;">
            <h2 class="payslip-title"><u>PAYSLIP </u></h2>
        </div>
        <div class="table-cell" style="width:33%; text-align:right;">
            <p>Payslip No: {{ $data->payslip_number }}</p>
            <p>Date: {{ $data->date }}</p>
        </div>
    </div>
    <br>
    <div class="table-container">
        <div class="table-cell" style="width:49%; border:1px solid gray; border-radius:5px; padding:10px;">
            <div>
                <strong style="margin:12px">Employee Details</strong>
                <hr>
            </div>
            <table style="width:100%;">
                <tr>
                    <td>Employee Name</td>
                    <td style="text-align: right;">
                        {{ $data->employee->first_name ?? '---' }} {{ $data->employee->last_name ?? '---' }}</td>
                </tr>
                <tr>
                    <td>Employee Id</td>
                    <td style="text-align: right;">{{ $data->employee_id ?? '---' }}</td>
                </tr>
                <tr>
                    <td>Department</td>
                    <td style="text-align: right;">{{ $data->department->name ?? '---' }}</td>
                </tr>
                <tr>
                    <td style="">Designation</td>
                    <td style="text-align: right; ;">{{ $data->designation->name ?? '---' }}</td>
                </tr>
            </table>
        </div>

        <div class="gap"></div>

        <div class="table-cell" style="width:49%; border:1px solid gray; border-radius:5px; padding:10px;">
            <div>
                <strong style="margin:12px">Other Details</strong>
                <hr>
            </div>
            <table style="width:100%;">


                <tr>
                    <td>Salary Month</td>
                    <td style="text-align: right;">{{ $data->month }}, {{ $data->year }}</td>
                </tr>
                <tr>
                    <td>Salary Type</td>
                    <td style="text-align: right;">{{ $data->salary_type }}</td>
                </tr>
                <tr>
                    <td>Presents</td>
                    <td style="text-align: right;">{{ $data->present }}</td>
                </tr>
                <tr>
                    <td style="">Absent</td>
                    <td style="text-align: right; ">{{ $data->absent }}
                    </td>
                </tr>
            </table>
        </div>

    </div>
    <br>
    <div class="table-container">
        <div class="table-cell" style="width:49%; border:1px solid gray; border-radius:5px; padding:10px;">
            <table style="width:100%;">
                <tr>
                    <th>Earnings</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
                @foreach ($data->earnings as $earning)
                    <tr>
                        <td>{{ $earning['label'] }}</td>
                        <td style="text-align: right;">
                            {{ number_format((float) $earning['value'], 2, '.', '') }}
                        </td>
                    </tr>
                @endforeach

                <tr>
                    <th style="border:none">Total Earning</th>
                    <th style="text-align: right; border:none;">
                        {{ number_format((float) $data->salary_and_earnings, 2, '.', '') }}
                    </th>
                </tr>
            </table>
        </div>

        <div class="gap"></div>

        <div class="table-cell" style="width:49%; border:1px solid gray; border-radius:5px; padding:10px;">
            <table style="width:100%;">



                <tr>
                    <th>Deductions</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
                @foreach ($data->deductions as $item)
                    <tr>
                        <td>
                            {{ $item['label'] }}
                        </td>
                        <td style="text-align: right;">

                            {{ number_format((float) $item['value'], 2, '.', '') }}


                        </td>
                    </tr>
                @endforeach
                @php
                    $countdifference = count($data->earnings) - count($data->deductions);
                @endphp


                @for ($i = 1; $i <= $countdifference; $i++)
                    <tr>
                        <td>&nbsp;</td>
                        <td style="text-align: right;">&nbsp;</td>
                    </tr>
                @endfor


                <tr>
                    <th>Total Deductions</th>
                    <th style="text-align: right;">
                        {{ number_format((float) $data->deductedSalary, 2, '.', '') }}
                    </th>
                </tr>
                {{-- <tr>
                    <td>Absent</td>
                    <td style="text-align: right;">$5,000</td>
                </tr>

                <tr>
                    <td style="height:20px;"></td>
                    <td style="text-align: right;"></td>
                </tr>
                <tr>
                    <td style="height:20px;"></td>
                    <td style="text-align: right;"></td>
                </tr>

                <tr>
                    <th style="border:none">Total Deduction</th>
                    <th style="text-align: right; border:none;">$1,000</th>
                </tr> --}}
            </table>
        </div>
    </div>
    <br>
    <div class="table-container">
        <table style="width:100%;">
            <tr>
                <th style="border:none">Net Salary: {{ number_format((float) $data->earnedSubTotal, 2, '.', '') }}</th>
                <th style="text-align: left; border:none;"></th>
            </tr>
        </table>


    </div>


</body>

</html>
