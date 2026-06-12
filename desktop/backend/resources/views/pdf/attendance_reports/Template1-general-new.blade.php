<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

<body>

    <div id="footer">
        <div class="pageCounter" style="margin-bottom:-2px">
            {{-- <p class="page"> </p> --}}
            <p></p>
            @php
            $p = count($data);
            if ($p <= 1) { echo '<span></span>' ; } else { for ($a=1; $a <=$p; $a++) { echo '<span></span>' ; } } @endphp </div>

                <!-- <div id="pageNumbers">
                    <div class="page-number" style="font-size: 9px"></div>
                </div> -->
        </div>
        <footer id="page-bottom-line" style="padding-top: 90px!important">
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
        $pageBreak="true";

        $totalAbsents=0;
        @endphp

        <table class="main-table">

            @if (count($data)==0)


            <tr style=" border: none;backgdround-color:red;padding-top:0px;margin-top:0px">
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
                <td style="border: nonse" colspan="6">
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
                                        {{ $company->report_type }} Report
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

                <td style="border: nosne;text-align:center" colspan=" 7  ">
                    @if ($request->shift_type_id=='')


                    <div style="text-center">
                        Total Employees : {{count($data)}}

                    </div>
                    @endif
                    <table class=" summary-table" style="backgroudnd-color:red; margin-top:20px">
                        <tr class="summary-header" style="border: none;background-color:#eeeeee">
                            <th style="text-align: center; border :none; padding:5px">EID</th>
                            <th style="text-align: center; border :none">Name</th>
                            <th style="text-align: center; border :none">Department</th>
                            <th style="text-align: center; border :none">Report Type</th>
                        </tr>
                        <tr style="border: none">
                            <td style="text-align: center; border :none; padding:5px;font-size:11px">
                                {{ '---' }}
                            </td>
                            <td style="text-align: center; border:none;font-size:11px">
                                {{ '---' }}
                            </td>
                            <td style="text-align: center; border:none;font-size:11px">
                                {{ '---' }}
                            </td>
                            <td style="text-align: center; border:none;font-size:11px">
                                General
                            </td>
                        </tr>



                        <tr class="summary-header" style="border: none;background-color:#eeeeee">
                            <th style="text-align: center; border :none; padding:5px">Present</th>
                            <th style="text-align: center; border :none">Absent</th>
                            <th style="text-align: center; border :none">Week Off</th>
                            <th style="text-align: center; border :none">Leaves </th>
                        </tr>
                        <tr style="border: none">
                            <td style="text-align: center; border :none; padding:5px;color:green">
                                {{ getStatus($data->toArray())['P'] ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none;color:red">
                                {{ getStatus($data->toArray())['A'] ?? 0 }}
                            </td>

                            <td style="text-align: center; border :none;color:gray">
                                {{ getStatus($data->toArray())['O'] ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none;color:blue">
                                {{ getStatus($data->toArray())['L'] ?? 0 }}
                            </td>
                        </tr>
                        <tr class="summary-header" style="border: none;background-color:#eeeeee ">
                            <th style="text-align: center; border :none">Holidays</th>
                            <th style="text-align: center; border :none">Missing</th>

                            <th style="text-align: center; border :none; padding:5px">Work Hours</th>
                            <th style="text-align: center; border :none">OT Hours</th>

                            {{-- <th style="text-align: center; border :none">Department</th> --}}
                        </tr>
                        <tr style="border: none">
                            <td style="text-align: center; border :none;color:pink">
                                {{ getStatus($data->toArray())['H'] ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none;color:orange">
                                {{ getStatus($data->toArray())['M'] ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none; padding:5px;color:black">
                                {{ $empTotWrkHrs ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none;color:black">
                                {{ $empTotOtHrs ?? 0 }}
                            </td>
            </tr>
        </table>
        <table>
            <tr>

                <td colspan="19" style="text-align:center">
                    No Records Found
                </td>
            </tr>



            @endif
            @foreach ($data as $empID => $employee)
            @php
            $empTotWrkHrs = getTotalHours($employee->toArray(), 'total_hrs');
            $empTotOtHrs = getTotalHours($employee->toArray(), 'ot');
            $singleEmployee = $employee[key(reset($employee))][0]->employee;
            // $empName = $singleEmployee->display_name ?? '';
            $empName = $employee[key(reset($employee))][0]->employee->first_name? $employee[key(reset($employee))][0]->employee->first_name.' '. $employee[key(reset($employee))][0]->employee->last_name : '';



            $date1 = new DateTime($company->start);
            $date2 = new DateTime($company->end);

            $interval = $date1->diff($date2);



            @endphp
            @if ($shift_type_id == 2)


            @else

            @if($pageBreak=='true')
            <tr style=" border: none;backgdround-color:red;padding-top:0px;margin-top:0px">
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
                <td style="border: nonse" colspan="6">
                    <div class="col-12" style="text-align:center;height:85px;">

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
                                        {{ $company->report_type }} Report
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

                <td style="border: nosne;text-align:center" colspan="{{ $interval->format('%a')>=2 ?  4 :7 }}">
                    @if ($request->shift_type_id=='')


                    <div style="text-center">
                        Total Employees : {{count($data)}}

                    </div>
                    @endif
                    <table class=" summary-table" style="backgroudnd-color:red; margin-top:20px">
                        <tr class="summary-header" style="border: none;background-color:#eeeeee">
                            <th style="text-align: center; border :none; padding:5px">EID</th>
                            <th style="text-align: center; border :none">Name</th>
                            <th style="text-align: center; border :none">Department</th>
                            <th style="text-align: center; border :none">Report Type</th>
                        </tr>
                        <tr style="border: none">
                            <td style="text-align: center; border :none; padding:5px;font-size:11px">
                                @if($interval->format('%a')>=2) {{ $empID ?? '---' }} @endif
                            </td>
                            <td style="text-align: center; border:none;font-size:11px">
                                @if($interval->format('%a')>=2) {{ $empName ?? '---' }} @endif
                            </td>
                            <td style="text-align: center; border:none;font-size:11px">
                                @if($interval->format('%a')>=2) {{ $singleEmployee->department->name ?? '---' }} @endif
                            </td>
                            <td style="text-align: center; border:none;font-size:11px">
                                General
                            </td>
                        </tr>



                        <tr class="summary-header" style="border: none;background-color:#eeeeee">
                            <th style="text-align: center; border :none; padding:5px">Present</th>
                            <th style="text-align: center; border :none">Absent</th>
                            <th style="text-align: center; border :none">Week Off</th>
                            <th style="text-align: center; border :none">Leaves </th>
                        </tr>
                        <tr style="border: none">
                            <td style="text-align: center; border :none; padding:5px;color:green">
                                {{ getStatus($data->toArray())['P'] ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none;color:red">
                                {{ getStatus($data->toArray())['A'] ?? 0 }}
                            </td>

                            <td style="text-align: center; border :none;color:gray">
                                {{ getStatus($data->toArray())['O'] ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none;color:blue">
                                {{ getStatus($data->toArray())['L'] ?? 0 }}
                            </td>
                        </tr>
                        <tr class="summary-header" style="border: none;background-color:#eeeeee ">
                            <th style="text-align: center; border :none">Holidays</th>
                            <th style="text-align: center; border :none">Missing</th>

                            <th style="text-align: center; border :none; padding:5px">Work Hours</th>
                            <th style="text-align: center; border :none">OT Hours</th>

                            {{-- <th style="text-align: center; border :none">Department</th> --}}
                        </tr>
                        <tr style="border: none">
                            <td style="text-align: center; border :none;color:pink">
                                {{ getStatus($data->toArray())['H'] ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none;color:orange">
                                {{ getStatus($data->toArray())['M'] ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none; padding:5px;color:black">
                                {{ $empTotWrkHrs ?? 0 }}
                            </td>
                            <td style="text-align: center; border :none;color:black">
                                {{ $empTotOtHrs ?? 0 }}
                            </td>
            </tr>
            <tr style="border: none">
                <th style="text-align: center; border :none" colspan="4">
                    <hr>
                </th>
            </tr>

        </table>
        <br>
        </td>
        </tr>
        @endif

        @endif



        @if ($shift_type_id == 2)

        <tr class="my-break">
            <td colspan="17" style="border: none;"></td>
        </tr>
        @else
        @if($pageBreak=='true' ) <tr style="text-align: left;font-weight:bold;margin-top:20px;  width:100%;">
            <td colspan="1" style="text-align: left;"> # </td>
            <td colspan="1" style="text-align: center;"> Date </td>
            @if($interval->format('%a')<=2) <td colspan="3" style="text-align: center;"> Employee </td>
                @endif
                <td colspan="2" style="text-align: center;"> Shift </td>
                <td colspan="2" style="text-align: center;"> In Time </td>
                <td colspan="2" style="text-align: center;"> Out Time </td>
                <td colspan="2" style="text-align: center;"> Late In </td>
                <td colspan="2" style="text-align: center;"> Early Out </td>
                <td colspan="2" style="text-align: center;"> Total Hours </td>
                <td colspan="1" style="text-align: center;"> OT </td>
                <td colspan="1" style="text-align: center;"> Status </td>
        </tr>
        @endif
        @foreach ($employee as $date)
        @php


        $employee = $date[0];
        if ($employee->status == 'P') {
        $statusColor = 'green';
        } elseif ($employee->status == 'A') {
        $statusColor = 'red';
        } elseif ($employee->status == 'M') {
        $statusColor = 'orange';
        } elseif ($employee->status == 'O') {
        $statusColor = 'gray';
        } elseif ($employee->status == 'L') {
        $statusColor = 'blue';
        } elseif ($employee->status == 'H') {
        $statusColor = 'pink';
        } elseif ($employee->status == '---') {
        $statusColor = '#f34100ed';
        }

        $pic=getcwd() . '/no-profile-image.jpg';

        if( $employee->employee->profile_picture )
        {
        $pic=getcwd() . '/media/employee/profile_picture/'.$employee->employee->profile_picture_raw;

        }

        @endphp

        <tbody>
            <tr style="text-align:  center">
                <td colspan="1">{{ ++$i }}</td>
                <td colspan="1" style="text-align:  center;">{{ $employee->date ?? '---' }}
                    <div class="secondary-value" style="font-size:6px">{{ $employee->day ?? '---' }}</div>
                </td>
                @if($interval->format('%a')<=2) <td colspan="3" style="text-align:center">


                    <img style="
                  border-radius: 50%;
                  height: auto;
                  width: 20px;
                  float:left
                 
                  
                " src="{{  $pic }}" />


                    {{ $employee->employee->first_name   }} {{ $employee->employee->last_name   }}
                    <div class="secondary-value" style="font-size:6px" style="height:20px">
                        {{ $employee->employee->employee_id   }}
                    </div>



                    </td>
                    @endif


                    <td colspan="2" style="text-align:  center;">
                        @if ($employee->schedule)


                        <div>
                            {{ $employee->schedule->shift->on_duty_time   }} - {{ $employee->schedule->shift->off_duty_time   }}
                            <div class="secondary-value" style="font-size:6px">
                                {{ $employee->schedule->shift->name   }}
                            </div>
                        </div>
                        @endif
                    </td>
                    <td colspan="2" style="text-align:  center;">
                        <div>
                            {{ $employee->in ?? '---' }}
                            <div class="secondary-value" style="font-size:6px">
                                {{ $employee->device_in->name  ?? '---' }}
                            </div>
                        </div>
                    </td>
                    <td colspan="2" style="text-align:  center;">
                        <div>
                            {{ $employee->out ?? '---' }}
                            <div class="secondary-value" style="font-size:6px">
                                {{ $employee->device_out->name  ?? '---' }}
                            </div>
                        </div>
                    </td>
                    <td colspan="2" style="text-align:  center;">
                        <div>
                            {{ $employee->late_coming  ?? '---' }}
                        </div>
                    </td>
                    <td colspan="2" style="text-align:  center;">
                        <div>
                            {{ $employee->early_going  ?? '---' }}
                        </div>
                    </td>

                    <td colspan="2" style="text-align:  center;"> {{ $employee->total_hrs ?? '---' }} </td>
                    <td colspan="1" style="text-align:  center;"> {{ $employee->ot ?? '---' }} </td>
                    <td colspan="1" style="text-align:  center; color:{{ $statusColor }}">
                        {{ str_replace("O","W",$employee->status) ?? '---' }}

                        <div class="secondary-value" style="font-size:6px">
                            @if ($employee['shift'] && $employee->status=="P")
                            @php
                            $shiftWorkingHours = $employee['shift']['working_hours'];
                            $employeeHours = $employee['total_hrs'];

                            if (
                            $shiftWorkingHours !== "" &&
                            $employeeHours !== "" &&
                            $shiftWorkingHours !== "---" &&
                            $employeeHours !== "---"
                            ) {
                            [$hours, $minutes] = explode(":", $shiftWorkingHours) ;
                            $shiftWorkingHours = $hours * 60 + $minutes;

                            [$hours, $minutes] = explode(":", $employeeHours) ;
                            $employeeHours = $hours * 60 + $minutes;

                            if ($employeeHours < $shiftWorkingHours) { echo "Short Shift" ; } } @endphp @endif </div>

                    </td>

            </tr>
        </tbody>

        @php
        if((int)$interval->format('%a')<=2) { $pageBreak='false' ; } @endphp @endforeach @if ($pageBreak=='true' ) <tr class="my-break">
            <td colspan="11" style="border: none;"></td>
            </tr>
            @else

            @endif
            @endif
            @php


            if($pageBreak=='true')
            $i = 0; @endphp


            @endphp @endforeach </table>
            @php

            function getStatus($data)
            {
            $countA = 0;
            $countP = 0;
            $countM = 0;
            $countO = 0;
            $countL = 0;
            $countH = 0;
            foreach ($data as $employeeData) {
            foreach ($employeeData as $employee) {

            $status = $employee[0]['status'];
            if ($status == 'A') {
            $countA++;
            } elseif ($status == 'P') {
            $countP++;
            } elseif ($status == 'M') {
            $countM++;
            } elseif ($status == 'O') {
            $countO++;
            } elseif ($status == 'L') {
            $countL++;
            } elseif ($status == 'H') {
            $countH++;
            }
            }

            }
            return [
            'A' => $countA,
            'P' => $countP,
            'M' => $countM,
            'O' => $countO,
            'L' => $countL,
            'H' => $countH,
            ];
            }

            function getTotalHours($employeeData, $type)
            {
            if (!is_array($employeeData)) {
            throw new InvalidArgumentException('Invalid employee data: must be an array');
            }
            $totalMinutes = 0;
            foreach ($employeeData as $employee) {
            if (!is_array($employee) || empty($employee[0]) || !isset($employee[0]['total_hrs'])) {
            throw new InvalidArgumentException("Invalid employee data: each employee must be an array with a 'total_hrs' key");
            }
            $time = $employee[0][$type];
            if ($time != '---') {
            $parts = explode(':', $time);
            $hours = intval($parts[0]);
            $minutes = intval($parts[1]);
            $totalMinutes += $hours * 60 + $minutes;
            }
            }

            $hours = floor($totalMinutes / 60);
            $minutes = $totalMinutes % 60;

            return sprintf('%02d:%02d', $hours, $minutes);
            }

            @endphp

</body>
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

    #header {
        position: fixed;
        top: 0px;


        text-align: center;
        font-size: 12px;
    }

    #page-bottom-line {
        position: fixed;
        right: 0px;
        bottom: -5px;
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


    /* @page {
        margin: -10px 30px 25px 50px;
    } */
    @page {
        margin: 5px 30px 25px 50px;
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