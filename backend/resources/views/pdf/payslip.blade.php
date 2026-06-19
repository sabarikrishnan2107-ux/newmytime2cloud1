<!DOCTYPE html>
<html>

<head>
    <style>
        * {
            font-family: "Source Sans Pro", sans-serif !important;
        }

        body {
            padding: 0;
            margin: 0;
            font-family: "Source Sans Pro", sans-serif !important;
            font-size: 13px;
        }

        table {
            width: 100%;
            border-collapse: collapse;


        }

        /* th,
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
        } */
        /* .table-cell {
            display: table-cell;
        } */

        .table-payslip td {
            text-align: left;
            padding: 0px;

            /* line-height: 30px; */
        }

        .table-payslip table,
        .table-payslip div {
            border-collapse: collapse;
            font-size: 13px;
            color: black;
        }
    </style>
</head>

<body>
    <table style="width: 100%; margin: auto" class="table-payslip">

        <tr>
            <td>
                <table style="width: 100%">
                    <tr>
                        <td style="width: 50%;padding-left:10px ">

                            <div>
                                @if (env('APP_ENV') !== 'local')
                                    <img src="{{ $data->company->logo }}"
                                        style="border-radius: 10%; width: auto;height:50px; max-height: 100px">
                                @else
                                    <img src="https://th.bing.com/th/id/R.b4e3fb857db675de7df59ab6f4cf30ab?rik=gbQLvTh9DaC6tQ&pid=ImgRaw&r=0"
                                        style="border-radius: 10%;width: auto; max-height: 100px ;height:50px;">
                                @endif
                            </div>
                            <div>
                                <div class="ml-3 mt-0" style="font-size: 12px">
                                    <div style="border-top: 1px solid white;font-size: 13px">
                                        <strong>{{ $data->company->name }}</strong>
                                    </div>
                                    <div style="font-size: 12px">
                                        {{ $data->company->location }},
                                    </div>
                                    <div style="font-size: 12px">
                                        {{ $data->company->p_o_box_no }}
                                    </div>
                                </div>
                            </div>


                        </td>
                        <td style="text-align: right; line-height: 1.6">
                            <table style="width: 100%; text-align: right">
                                <tr>
                                    <td style="font-size: 28px; text-align: right">
                                        PAYSLIP
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: right; font-size: 12px">
                                        Ref:{{ $data->payslip_number }}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: right; font-size: 12px">
                                        Date: {{ $data->date }}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: right; font-size: 12px">
                                        Month: {{ $data->payslip_month_year }}
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td
                style="
                border: 0px solid #ddd;
                padding-left: 10px;
                padding-top:30px;
                line-height: 16px;
              ">
                <table style="width: 100%">
                    <tr>
                        <td>
                            <div style="">Pay To :</div>
                            <span v-if="employee && $data->employee->first_name"
                                style="font-size: 12px; font-weight: bold">{{ $data->employee->first_name }}</span>
                            <span v-if="employee && $data->employee->last_name"
                                style="font-size: 12px; font-weight: bold">{{ $data->employee->last_name }}</span>

                            <div style="font-size: 12px">
                                #{{ $data->employee_id }} ,


                                {{ $data->employee->department->name }}
                            </div>
                            <div></div>
                            <div style="font-size: 12px">
                                {{ $data->employee->designation->name }}
                            </div>
                        </td>

                        <td style="text-align: right; padding-right: 0px">
                            <table style="width: 100%;font-size:12px">
                                <tr>
                                    <td>Total Days</td>
                                    <td>{{ $data->total_month_days }}</td>
                                </tr>
                                <tr>
                                    <td>Present</td>
                                    <td>{{ $data->present }}</td>
                                </tr>
                                <tr>
                                    <td>Absent</td>
                                    <td>{{ $data->absent }}</td>
                                </tr>
                                <tr>
                                    <td>Week Off</td>
                                    <td>{{ $data->week_off }}</td>
                                </tr>

                                <tr>
                                    <td>Late Hours</td>
                                    <td>{{ $data->lateHours['hm'] }}</td>
                                </tr>

                                <tr>
                                    <td>Early Hours</td>
                                    <td>{{ $data->earlyHours['hm'] }}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <tr>
            <td>
                <table
                    style="
                  width: 100%;
                  border: 0px solid #ddd;
                  padding-left: 0px;
                  margin-top: 15px;
                 
                ">
                    <tr
                        style="
                    background-color: #4d5973;
                    color: #fff;

                    
                  ">
                        <td style="padding-left: 10px; text-align: left;vertical-align:middle;height: 35px;">Earnings
                        </td>
                        <td style="text-align: right">
                            <!-- <span style="">AED</span> -->
                        </td>
                    </tr>
                    <tr style=" line-height:30px;">
                        <td style="width: 100%; padding-right: 0px">
                            <table style="width: 100%; padding-right: 00px">
                                <tr>
                                    <td colspan="2" style="text-align: center; font-weight: bold"></td>
                                </tr>
                                @foreach ($data->earnings as $index => $earning)
                                    <tr style="border-bottom: 1px solid #ddd;">
                                        <td style="text-align: left; padding-left: 10px">
                                            {{ $index + 1 }} &nbsp;&nbsp;&nbsp;&nbsp;{{ $earning['label'] }}
                                        </td>
                                        <td style="text-align: right;  padding-right: 40px; ">
                                            {{ number_format($earning['value'], 2) }}
                                        </td>
                                    </tr>
                                @endforeach
                                <tr style="font-weight: bold">
                                    <td
                                        style="
                            width: 150px;
                            text-align: left;
                            padding-left: 10px;
                            font-weight: bold;
                            padding-bottom: 20px;
                          ">
                                        Total Earnings
                                    </td>
                                    <td
                                        style="
                            text-align: right;
                            padding-bottom: 20px;
                            padding-right: 40px;
                          ">
                                        {{ number_format($data->salary_and_earnings, 2) }}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr
                        style="
                    background-color: #4d5973;
                    color: #fff;
                    margin-top: 20px;
                    height: 25px;
                    
                  ">
                        <td
                            style="
                      padding-left: 10px;
                      text-align: left;
                      height: 25px;
                    ">
                            Deductions
                        </td>
                        <td style="text-align: right; line-height: 30px">
                            <!-- <span style="">AED</span> -->
                        </td>
                    </tr>
                    <tr style="line-height: 20px;">
                        <td style="width: 100%; padding-right: 0px">
                            <table style="width: 100%; line-height: 30px">
                                <tr>
                                    <td colspan="2" style="text-align: center; font-weight: bold"></td>
                                </tr>
                                @foreach ($data->deductions as $index => $deductions)
                                    <tr style="border-bottom: 1px solid #ddd">
                                        <td style="text-align: left; padding-left: 10px">
                                            {{ $index + 1 }} &nbsp;&nbsp;&nbsp;&nbsp;
                                            {{ $deductions['label'] }}
                                        </td>
                                        <td style="text-align: right; padding-right: 40px">
                                            {{ number_format($deductions['value'], 2) }}
                                        </td>
                                    </tr>
                                @endforeach
                                <tr style="font-weight: bold">
                                    <td
                                        style="
                            width: 150px;
                            text-align: left;
                            padding-left: 10px;
                            font-weight: bold;
                            padding-bottom: 20px;
                          ">
                                        Total Deductions
                                    </td>
                                    <td
                                        style="
                            text-align: right;
                            padding-bottom: 20px;
                            padding-right: 40px;
                          ">
                                        {{ number_format($data->totalDeductions, 2) }}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr style="background-color: #4d5973; color: #fff; height: 20px">
                        <td
                            style="
                      padding-left: 10px;
                      text-align: left;
                      height: 25px;
                    ">
                            Salary Summary
                        </td>
                        <td style="text-align: right; line-height: 30px">
                            <!-- <span style="">AED</span> -->
                        </td>
                    </tr>
                    <tr style="line-height: 20px;">
                        <td style="width: 100%; padding-right: 0px">
                            <table style="width: 100%;line-height: 30px;">
                                <tr>
                                    <td style="padding-left: 10px; text-align: center" colspan="2"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #ddd">
                                    <td style="padding-left: 10px; text-align: left">
                                        Total Earnings
                                    </td>
                                    <td style="text-align: right; padding-right: 40px">
                                        {{ number_format($data->salary_and_earnings, 2) }}
                                    </td>
                                </tr>
                                <tr style="border-bottom: 1px solid #ddd">
                                    <td style="padding-left: 10px; text-align: left">
                                        Total Deductions
                                    </td>
                                    <td style="text-align: right; padding-right: 40px">
                                        - {{ number_format($data->totalDeductions, 2) }}
                                    </td>
                                </tr>
                                <tr style="font-weight: bold; border-bottom: 1px solid #ddd">
                                    <td style="padding-left: 10px; text-align: left">
                                        Net Salary
                                    </td>
                                    <td style="text-align: right; padding-right: 40px">
                                        AED {{ number_format($data->finalSalary, 2) }}
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="text-align: right; padding-right: 40px">
                                        AED {{ $data->final_salary_in_words }} only
                                    </td>
                                </tr>

                                <tr style="font-weight: bold">
                                    <td style="height: 50px"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td
                            style="
                      padding-left: 10px;
                      font-size: 14px;
                      line-height: 14px;
                    ">
                            Note:
                            <div>
                                This payslip is generated automatically. If you notice any
                                discrepancies or missing information, please contact the
                                HR team.
                            </div>
                        </td>
                    </tr>
                    <tr style="font-weight: bold">
                        <td style="height: 30px"></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

</body>

</html>
