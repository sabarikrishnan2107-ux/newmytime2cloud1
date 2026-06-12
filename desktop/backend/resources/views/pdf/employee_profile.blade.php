<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

<head>

<body>
    <header class="row">
        <table style=" width:100%">
            <tr>
                <td style="text-align: left;  padding:15px;  width:20%  ">

                    @if (isset($employee->company['logo']))

                    <img src="{{$employee->company['logo']}}" width="150">

                    @else
                    <img src="{{ env('BASE_URL').'/no-company-logo.png'}}" width="150">


                    @endif



                </td>
                <td style="  text-align: center;width:40% ;
    vertical-align: middle;font-size:16px;border:0px solid black ">
                    <div>
                        {{$employee->first_name}} {{$employee->last_name}} <br />

                        Employee ID: {{$employee->employee_id}}
                    </div>
                </td>
                <td style="float:right;text-align:right;padding-right:5px;width:40% ">
                    <div>
                        {{$employee->company['name']}}
                    </div>
                    <div>
                        {{$employee->company['p_o_box_no']}}
                    </div>
                    <div> {{$employee->company['location']}} </div>
                    <div>Tel: {{$employee->company['mol_id']}} </div>


                </td>
            </tr>
        </table>
    </header>
    <main>
        <p>page1</p>
        <p>page2></p>
    </main>
    @php
    for($i=0;$i<=0;$i++) { @endphp <table style=" width:100%">
        <!-- <tr>
            <td style="text-align: left;  padding:15px;  width:20%  ">

                @if ($employee->company['logo'] !='')

                <img src="{{$employee->company['logo']}}" width="150">

                @else
                <img src="{{ env('BASE_URL').'/no-company-logo.png'}}" width="150">
                @endif



            </td>
            <td style="  text-align: center;width:40% ;
    vertical-align: middle;font-size:16px;border:0px solid black ">
                <div>
                    {{$employee->first_name}} {{$employee->last_name}} <br />

                    Employee ID: {{$employee->employee_id}}
                </div>
            </td>
            <td style="float:right;text-align:right;padding-right:5px;width:40% ">
                <div>
                    {{$employee->company['name']}}
                </div>
                <div>
                    {{$employee->company['p_o_box_no']}}
                </div>
                <div> {{$employee->company['location']}} </div>
                <div>Tel: {{$employee->company['mol_id']}} </div>


            </td>
        </tr> -->

        <tr>
            <td colspan="3">
                <table>
                    <tr>
                        <td class="border">
                            <table>
                                <tr>
                                    <td style=" text-align:center">

                                        <div style="height:250px;vertical-align:middle">
                                            <img src="{{  $employee->profile_picture  }}" style="padding-top:10px" width="230" height="auto">
                                        </div>
                                        <div class="border-top"><span class="material-symbols-outlined" style="    vertical-align: middle;">
                                                <img src="{{ env('BASE_URL').'/icons/person.png'}}" width="13">
                                            </span> {{ $employee->first_name  }} {{ $employee->last_name  }}
                                        </div>
                                        <div class="border-top"> <span class="material-symbols-outlined">
                                                <img src="{{ env('BASE_URL').'/icons/id.png'}}" width="13">
                                            </span> Employee ID: {{ $employee->employee_id  }}
                                        </div>
                                        <div class="border-top  ">DOJ: {{ date('d M Y', strtotime($employee->joining_date))  }}
                                        </div>

                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <table>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space"><span style="color:blue" class="material-symbols-outlined">
                                                        <img src="{{ env('BASE_URL').'/icons/mobile.png'}}" width="20">
                                                    </span></td>
                                                <td style="text-align:right" class="right-space">{{ $employee->phone_number  }}</td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">
                                                    <img src="{{ env('BASE_URL').'/icons/whatsapp.png'}}" width="20">
                                                </td>
                                                <td style="text-align:right" class="right-space">{{ $employee->whatsapp_number  }}</td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space"><span class="red material-symbols-outlined">
                                                        <img src="{{ env('BASE_URL').'/icons/mail.png'}}" width="20">
                                                    </span></td>
                                                <td style="text-align:right" class="right-space">{{ $employee->local_email  }}
                                                </td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space"><span class="material-symbols-outlined">
                                                        <img src="{{ env('BASE_URL').'/icons/login.png'}}" width="20">
                                                    </span></td>
                                                <td style="text-align:right" class="right-space">Last Login : {{ date('d M Y', strtotime($employee->last_login))  }}
                                                </td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space green">

                                                    @if ($employee->status)

                                                    <span class="material-symbols-outlined green">
                                                        <img src="{{ env('BASE_URL').'/icons/off.png'}}" width="20">
                                                    </span>

                                                    @else
                                                    <span class="material-symbols-outlined red">
                                                        <img src="{{ env('BASE_URL').'/icons/on.png'}}" width="20">
                                                    </span>
                                                    @endif



                                                </td>
                                                <td style="text-align:right" class="right-space">Employee Status
                                                </td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">
                                                    @if ($employee->user->web_login_access)

                                                    <span class="material-symbols-outlined green">
                                                        <img src="{{ env('BASE_URL').'/icons/off.png'}}" width="20">
                                                    </span>

                                                    @else
                                                    <span class="material-symbols-outlined red">
                                                        <img src="{{ env('BASE_URL').'/icons/on.png'}}" width="20">
                                                    </span>
                                                    @endif
                                                </td>
                                                <td style="text-align:right" class="right-space">Web Login
                                                </td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">
                                                    @if ($employee->user->mobile_app_login_access)

                                                    <span class="material-symbols-outlined green">
                                                        <img src="{{ env('BASE_URL').'/icons/off.png'}}" width="20">
                                                    </span>

                                                    @else
                                                    <span class="material-symbols-outlined red">
                                                        <img src="{{ env('BASE_URL').'/icons/on.png'}}" width="20">
                                                    </span>
                                                    @endif
                                                </td>
                                                <td style="text-align:right" class="right-space">Mobile App Login
                                                </td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">

                                                    @if ($employee->user->otp_whatsapp)

                                                    <span class="material-symbols-outlined green">
                                                        <img src="{{ env('BASE_URL').'/icons/off.png'}}" width="20">
                                                    </span>

                                                    @else
                                                    <span class="material-symbols-outlined red">
                                                        <img src="{{ env('BASE_URL').'/icons/on.png'}}" width="20">
                                                    </span>
                                                    @endif
                                                </td>
                                                <td style="text-align:right" class="right-space">Whatsapp OTP
                                                </td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">

                                                    @if ($employee->overtime)

                                                    <span class="material-symbols-outlined green">
                                                        <img src="{{ env('BASE_URL').'/icons/off.png'}}" width="20">
                                                    </span>

                                                    @else
                                                    <span class="material-symbols-outlined red">
                                                        <img src="{{ env('BASE_URL').'/icons/on.png'}}" width="20">
                                                    </span>
                                                    @endif
                                                </td>
                                                <td style="text-align:right" class="right-space">Over Time</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">

                                                    @if ($employee->user->tracking_status)

                                                    <span class="material-symbols-outlined green">
                                                        <img src="{{ env('BASE_URL').'/icons/off.png'}}" width="20">
                                                    </span>

                                                    @else
                                                    <span class="material-symbols-outlined red">
                                                        <img src="{{ env('BASE_URL').'/icons/on.png'}}" width="20">
                                                    </span>
                                                    @endif

                                                </td>
                                                <td style="text-align:right" class="right-space">Location Tracking
                                                </td>
                                            </tr>
                                        </table>
                                        <table>
                                            <tr>
                                                <th colspan="2" class="left-space   ">Position</th>

                                            </tr>

                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">Designation</td>
                                                <td style="text-align:right" class="right-space">: {{$employee->designation ? $employee->designation->name :'---'}}
                                                </td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">Department</td>
                                                <td style="text-align:right" class="right-space">: {{$employee->department ? $employee->department->name :'---'}}</td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">Sub Department</td>
                                                <td style="text-align:right" class="right-space">: {{$employee->sub_department ?$employee->sub_department->name :'---'}}</td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">Role(permissions)</td>
                                                <td style="text-align:right" class="right-space">: {{ $employee->user->role ?$employee->user->role->name:'---'}}</td>
                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">Branch Manager</td>
                                                <td style="text-align:right" class="right-space">: {{$employee->user->branchLogin ?$employee->user->branchLogin->branch_name : '---'}}</td>
                                            </tr>




                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>

                        <td class="border">
                            <table>

                                <tr>

                                    <th colspan="2" style="    text-align: center;
    background: #8838fb;
    color: #FFF;" class="left-space ">COMMUNICATION </th>
                                </tr>
                                <tr>
                                    <td style=" border-right:1px solid #DDD">
                                        <table>
                                            <tr>
                                                <th colspan="2" class="left-space ">Home Contact Details</th>

                                            </tr>
                                            <tr>
                                                <td class="left-space" style="width:100px">Home Mobile Number</td>
                                                <td class="text-right">: {{$employee->home_mobile ?$employee->home_mobile:'---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Home Email </td>

                                                <td class="text-right">: {{$employee->home_email ?$employee->home_email:'---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Home Address </td>

                                                <td class="text-right">: {{$employee->home_address ?$employee->home_address:'---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Home City </td>
                                                <td class="text-right">: {{$employee->home_city ?$employee->home_city:'---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Home State </td>

                                                <td class="text-right">: {{$employee->home_state ?$employee->home_state:'---'}}</td>
                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Home Country </td>

                                                <td class="text-right">: {{$employee->home_fax ?$employee->home_fax:'---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Home Fax</td>
                                                <td class="text-right">: {{$employee->home_fax ?$employee->home_fax:'---'}}</td>


                                            </tr>
                                            <!-- <tr class="border-top">
                                                <td class="left-space">&nbsp; </td>
                                                <td class="text-right"> &nbsp;</td>

                                            </tr> -->


                                        </table>



                                        <table class="border-top">
                                            <tr>
                                                <th colspan="2" class="left-space">Bank Details</th>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space" style="width:100px">Bank Name </td>
                                                <td class="text-right">: {{$employee->bank?$employee->bank->bank_name:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Bank Address </td>
                                                <td class="text-right">: {{$employee->bank?$employee->bank->address:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Account No </td>
                                                <td class="text-right">: {{$employee->bank?$employee->bank->account_no:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Account Name</td>
                                                <td class="text-right">: {{$employee->bank?$employee->bank->account_title:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">IBAN </td>
                                                <td class="text-right">: {{$employee->bank?$employee->bank->iban:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Other Text </td>
                                                <td class="text-right">: {{$employee->bank ? $employee->bank->other_text:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Other Value</td>
                                                <td class="text-right">: {{$employee->bank ? $employee->bank->other_value:'---'}} </td>

                                            </tr>



                                        </table>

                                        <table style="width:100%">
                                            <tr>
                                                <th colspan="2" style="vertical-align:middle">Qualification Details</th>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space" style="width:100px">Certificate </td>
                                                <td class="text-right">: {{$employee->qualification ? $employee->qualification->certificate:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">College </td>
                                                <td class="text-right">: {{$employee->qualification ? $employee->qualification->collage:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Start Date </td>
                                                <td class="text-right">: {{$employee->qualification ? $employee->qualification->start:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">End Date</td>
                                                <td class="text-right">: {{$employee->qualification ? $employee->qualification->end:'---'}} </td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Type </td>
                                                <td class="text-right">: {{$employee->qualification ? $employee->qualification->type:'---'}} </td>

                                            </tr>



                                        </table>
                                        <table>
                                            <tr>
                                                <th colspan="2">Payroll </th>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space" style="width:100px">Effective Date</td>
                                                <td class="text-right">: {{$employee->payroll ? $employee->payroll->effective_date_formatted :'--'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Basic Salary</td>
                                                <td class="text-right">: {{$employee->payroll ? $employee->payroll->basic_salary :'--'}}</td>

                                            </tr>
                                            @php


                                            if(isset($employee->payroll))
                                            {
                                            foreach ( $employee->payroll->earnings as $earnings)
                                            if(isset($earnings))
                                            {
                                            @endphp
                                            <tr class="border-top">
                                                <td class="left-space">{{$earnings['label']}}</td>
                                                <td class="text-right">: {{$earnings['value']}}</td>

                                            </tr>
                                            @php
                                            }

                                            }
                                            @endphp
                                        </table>
                                        <table>
                                            <tr>
                                                <th colspan="2">Other </th>

                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space" style="width:100px">Leave Group </td>
                                                <td style="text-align:right" class="right-space">: {{$employee->leave_group ? $employee->leave_group->group_name : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">Leave/Reporting Manger</td>
                                                <td style="text-align:right" class="right-space">: {{$employee->reporting_manager ? $employee->reporting_manager->first_name.' '.$employee->reporting_manager->last_name : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td style="text-align:left" class="left-space">Device Employee Id </td>
                                                <td style="text-align:right" class="right-space">{{$employee->system_user_id}}</td>

                                            </tr>




                                        </table>


                                    </td>
                                    <td>
                                        <table class="border-top">
                                            <tr>
                                                <th colspan="2" class="left-space">Current Address Details</th>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space" style="width:100px">Mobile </td>
                                                <td class="text-right">: {{$employee->phone_number ? $employee->phone_number:'---'}}</td>

                                            </tr>
                                            <!-- <tr class="border-top">
                                                <td class="left-space">Tel </td>
                                                <td class="text-right">: {{$employee->local_tel ? $employee->local_tel:'---'}}</td>

                                            </tr> -->
                                            <tr class="border-top">
                                                <td class="left-space">Address </td>
                                                <td class="text-right">: {{$employee->local_address ?$employee->local_address:'---'}}</td>

                                            </tr>


                                            <tr class="border-top">
                                                <td class="left-space">Fax</td>
                                                <td class="text-right">: {{$employee->local_fax?$employee->local_fax:'---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">City</td>
                                                <td class="text-right">: {{$employee->local_city?$employee->local_city:'---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">State </td>
                                                <td class="text-right">: {{$employee->local_country?$employee->local_country:'---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Country</td>
                                                <td class="text-right">: {{$employee->local_country?$employee->local_country:'---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space"> Email</td>
                                                <td class="text-right">: {{$employee->local_email?$employee->local_email:'---'}}</td>

                                            </tr>


                                        </table>
                                        <table>
                                            <tr>
                                                <th colspan="2" style="border-left:1px solid #FFF">Passport </th>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space" style="width:100px">Passport No </td>
                                                <td class="text-right">: {{$employee->passport ? $employee->passport->passport_no : '---'}}</td>


                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Country </td>
                                                <td class="text-right">: {{$employee->passport ? $employee->passport->country : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Exp Date</td>
                                                <td class="text-right">: {{$employee->passport ? $employee->passport->expiry_date : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Issue Date</td>
                                                <td class="text-right">: {{$employee->passport ? $employee->passport->issue_date : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Place Of Issue </td>
                                                <td class="text-right">: {{$employee->passport ? $employee->passport->country : '---'}}</td>

                                            </tr>


                                            <tr class="border-top">
                                                <td class="left-space">Note </td>
                                                <td class="text-right">: {{$employee->passport ? $employee->passport->note : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">&nbsp; </td>
                                                <td class="text-right">&nbsp;</td>

                                            </tr>
                                        </table>
                                        <table>
                                            <tr>
                                                <th colspan="2">Emirates </th>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space" style="width:100px">Emirate Id</td>
                                                <td class="text-right">: {{$employee->emirate ? $employee->emirate->emirate_id : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Nationality </td>
                                                <td class="text-right">: {{$employee->emirate ? $employee->emirate->nationality : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Issue Date</td>
                                                <td class="text-right">: {{$employee->emirate ? date('d M Y', strtotime($employee->emirate->issue)) : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Exp Date</td>
                                                <td class="text-right">: {{$employee->emirate ?  date('d M Y', strtotime($employee->emirate->expiry)) : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Date of Birth</td>
                                                <td class="text-right">: {{$employee->emirate ?  date('d M Y', strtotime($employee->emirate->date_of_birth)) : '---'}}</td>

                                            </tr>

                                        </table>
                                        <table>
                                            <tr>
                                                <th colspan="2">Visa </th>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space" style="width:100px">Visa Number</td>
                                                <td class="text-right">: {{$employee->visa ? $employee->visa->visa_no : '---'}}</td>

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Place Of Issue </td>
                                                <td class="text-right">: {{$employee->visa ? $employee->visa->place_of_issues : '---'}}

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Issue Date</td>
                                                <td class="text-right">: {{$employee->visa ?  date('d M Y', strtotime($employee->visa->issue_date)) : '---'}}

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Expiry Date</td>
                                                <td class="text-right">: {{$employee->visa ?  date('d M Y', strtotime($employee->visa->expiry_date)) : '---'}}

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Country </td>
                                                <td class="text-right">: {{$employee->visa ? $employee->visa->country : '---'}}

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Labour No </td>
                                                <td class="text-right">: {{$employee->visa ? $employee->visa->labour_no : '---'}}

                                            </tr>
                                            <tr class="border-top">
                                                <td class="left-space">Note</td>
                                                <td class="text-right">: {{$employee->visa ? $employee->visa->note : '---'}}

                                            </tr>


                                        </table>



                                    </td>
                                </tr>
                            </table>




                        </td>
                    </tr>

                </table>
            </td>

        </tr>
        </table>

        @php
        }
        @endphp
        <footer id="page-bottom-line" style="padding-top: 100px!important">
            <hr style="width: 100%;">
            <table class="footer-main-table">
                <tr style="border :none">
                    <td style="width:40%">&nbsp;</td>
                    <td style="text-align: center;border :none;">
                        <b>Powered by</b>: <span style="color:blue">
                            <a href="{{ env('APP_URL')}}" target="_blank">{{ env('APP_NAME')}}</a>
                        </span>
                    </td>
                    <td style="text-align: right;border :none">
                        Printed on : {{ date('d-M-Y ') }}
                    </td>
                </tr>
            </table>
        </footer>
</body>

<style>
    body {
        text-align: center;
        width: 100%;
        margin: auto;
        padding: 0px;
    }

    td,
    th {
        font-size: 10px;
        padding: 0px;
        margin: 0px;

        border: 0px solid #eeeeee;
        text-align: left;
        vertical-align: top;
    }

    table {
        font-family: arial, sans-serif;
        border-collapse: collapse;
        border: none;
        width: 100%;
        line-height: 20px;
    }


    th {
        background-color: #dbdbdb;
        padding-left: 5px !important;


        color: #8838fb;
    }


    .background {


        background-color: #8838fb;
        color: #FFF;
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

    .border {
        border: 1px solid #DDD;
    }

    .border-left {
        border-left: 1px solid #DDD;
        ;
    }

    .border-right {
        border-right: 1px solid #DDD;
        ;
    }

    .border-top {
        border-top: 1px solid #DDD;
        ;
    }

    .border-bottom {
        border-bottom: 1px solid #DDD;
        ;
    }

    .border-left0 {
        border-left: 0px solid #DDD;
        ;
    }

    .border-right0 {
        border-right: 0px solid #DDD;
        ;
    }

    .border-top0 {
        border-top: 0px solid #DDD;
        ;
    }

    .border-bottom0 {
        border-bottom: 0px solid #DDD;
        ;
    }

    .left-space {
        padding-left: 5px;
    }

    .right-space {
        padding-right: 5px;
    }

    .text-right {
        float: right;
        padding-right: 5px;
        text-align: right;
    }

    .text-left {
        text-align: left;
    }

    .header {
        background-color: #dbdbdb;
    }

    .material-symbols-outlined {
        vertical-align: middle;
    }

    .green {
        color: green;
    }

    .red {
        color: red;
    }

    td {
        border: 0px solid #DDD;
    }
</style>
</head>

</html>