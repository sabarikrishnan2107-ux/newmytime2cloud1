<!DOCTYPE html>
<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

<body style="text-align: center">

    <table style="width:100%">
        <tr>
            <td colspan="2">
                <div class="text-center lh-1 mb-2">
                    <h6 class="fw-bold">Payslip</h6> <span class="fw-normal">Payment slip for the month of

                        {{ $data->monthName }}-{{ $data->year }}</span>
                </div>
            </td>
        </tr>
        <tr>
            <td>
                <div class="  addressheight">
                    <address>
                        <div>

                            @if (env('APP_ENV') !== 'local')
                                <img src="{{ $data->company->logo }}" width="150px">
                            @else
                                <img src="{{ getcwd() . '/upload/app-logo.jpeg' }}" width="150px">
                                {{-- <img src="{{ 'http://localhost:8001/upload/app-logo.jpeg' }}" width="150px"> --}}
                            @endif
                        </div>
                        <strong>{{ $data->company->name }} </strong><br>
                        {{ $data->company->location }}
                    </address>
                </div>
            </td>
            <td>
                <div class=" text-right addressheight">
                    <address>
                        <strong>EMP ID: {{ $data->employee_id }}</strong><br>
                        Name: {{ $data->first_name }} {{ $data->last_name }}<br>
                        Designation: {{ $data->position }}<br>
                    </address>
                </div>
            </td>
        </tr>
        <tr>
            <td style="width:50%">

                <table class="mt-4 table table-bordered">
                    <thead class="bg-dark text-white">
                        <tr>
                            <th scope="col">Earnings</th>
                            <th scope="col">Amount</th>
                        </tr>
                    </thead>
                    <tbody>

                        @foreach ($data->earnings as $item)
                            <tr>
                                <td class="w-50">
                                    {{ $item['label'] }}
                                </td>
                                <td class="w-50 text-right">
                                    {{ $item['value'] }}
                                </td>
                            </tr>
                        @endforeach

                        <tr>
                            <th class="w-50"><strong>Total Earnings</strong></th>
                            <th class="w-50 text-right">
                                {{ $data->salary_and_earnings }}
                            </th>
                        </tr>
                    </tbody>
                </table>

            </td>
            <td style="width:50%">
                <table class="mt-4 table table-bordered">
                    <thead class="bg-dark text-white">
                        <tr>
                            <th scope="col">Deductions</th>
                            <th scope="col">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($data->deductions as $item)
                            <tr>
                                <td class="w-50">
                                    {{ $item['label'] }}
                                </td>
                                <td class="w-50 text-right">

                                    {{ number_format((float) $item['value'], 2, '.', '') }}


                                </td>
                            </tr>
                        @endforeach

                        @php
                            $countdifference = count($data->earnings) - count($data->deductions);
                        @endphp


                        @for ($i = 1; $i <= $countdifference; $i++)
                            <tr>
                                <td scope="row">&nbsp;</td>
                                <td class="text-right">&nbsp;</td>
                            </tr>
                        @endfor


                        <tr>
                            <th scope="row">Total Deductions</th>
                            <th class="text-right">
                                {{ $data->deducted_salary }}
                            </th>
                        </tr>
                    </tbody>
                </table>

            </td>
        </tr>
        <tr>
            <td>
                <span>Present Days: {{ $data->present_days }}</span>
                </div>
            </td>
            <td style="text-align:right">

                <span>Absent Days: {{ $data->absent_days }}</span>

            </td>
        </tr>

        <tr>
            <td colspan="2">
                <div class=" "><span><strong>Final Salary:
                            {{ $data->earned_sub_total }}

                        </strong> </span></div>

            </td>
        </tr>
    </table>





</body>
<style>
    /*! CSS Used from: Embedded */
    body {
        margin: 0;
        height: 100%;
    }

    *,
    :after,
    :before {
        box-sizing: border-box;
    }

    h6 {
        margin-top: 0;
        margin-bottom: .5rem;
        font-weight: 500;
        line-height: 1.2;
    }

    h6 {
        font-size: 1rem;
    }

    address {
        margin-bottom: 1rem;
        font-style: normal;
        line-height: inherit;
    }

    strong {
        font-weight: bolder;
    }

    img {
        vertical-align: middle;
    }

    table {
        caption-side: bottom;
        border-collapse: collapse;
    }

    th {
        text-align: inherit;
        text-align: -webkit-match-parent;
    }

    tbody,
    td,
    th,
    thead,
    tr {
        border: 0 solid;
        border-color: inherit;
    }

    @media (min-width:768px) {
        .col-md-3 {
            flex: 0 0 auto;
            width: 25%;
        }

        .col-md-6 {
            flex: 0 0 auto;
            width: 50%;
        }
    }

    .table {
        --mdb-table-bg: transparent;
        --mdb-table-accent-bg: transparent;
        --mdb-table-striped-color: #212529;
        --mdb-table-striped-bg: rgba(0, 0, 0, 0.05);
        --mdb-table-active-color: #212529;
        --mdb-table-active-bg: rgba(0, 0, 0, 0.1);
        --mdb-table-hover-color: #212529;
        --mdb-table-hover-bg: rgba(0, 0, 0, 0.075);
        width: 100%;
        margin-bottom: 1rem;
        color: #212529;
        vertical-align: top;
        border-color: #e0e0e0;
    }

    .table>:not(caption)>*>* {
        background-color: var(--mdb-table-bg);
        border-bottom-width: 1px;
        box-shadow: inset 0 0 0 9999px var(--mdb-table-accent-bg);
    }

    .table>tbody {
        vertical-align: inherit;
    }

    .table>thead {
        vertical-align: bottom;
    }

    .table>:not(:first-child) {
        border-top: 2px solid inherit;
    }

    .table-bordered>:not(caption)>* {
        border-width: 1px 0;
    }

    .table-bordered>:not(caption)>*>* {
        border-width: 0 1px;
    }

    .w-50 {
        width: 50% !important;
    }

    .mt-4 {
        margin-top: 1.5rem !important;
    }

    .mb-2 {
        margin-bottom: .5rem !important;
    }

    .fw-normal {
        font-weight: 400 !important;
    }

    .fw-bold {
        font-weight: 700 !important;
    }

    .lh-1 {
        line-height: 1 !important;
    }

    .text-center {
        text-align: center !important;
    }

    .text-white {
        --mdb-text-opacity: 1;
        color: rgba(var(--mdb-white-rgb), var(--mdb-text-opacity)) !important;
    }

    .bg-dark {
        --mdb-bg-opacity: 1;
        background-color: rgba(var(--mdb-dark-rgb), var(--mdb-bg-opacity)) !important;
    }

    .bg-dark {
        background-color: rgba(38, 38, 38, var(--mdb-bg-opacity)) !important;
    }

    .table {
        font-size: .9rem;
    }

    .table>:not(caption)>*>* {
        padding: 1rem 1.4rem;
    }

    .table th {
        font-weight: 500;
    }

    .table tbody {
        font-weight: 300;
    }

    .table>:not(:last-child)>:last-child>* {
        border-bottom-color: inherit;
    }

    *,
    ::after,
    ::before {
        box-sizing: border-box;
    }

    h6 {
        margin-top: 0;
        margin-bottom: .5rem;
        font-weight: 500;
        line-height: 1.2;
    }

    h6 {
        font-size: 1rem;
    }

    address {
        margin-bottom: 1rem;
        font-style: normal;
        line-height: inherit;
    }

    strong {
        font-weight: bolder;
    }

    img {
        vertical-align: middle;
    }

    table {
        caption-side: bottom;
        border-collapse: collapse;
    }

    th {
        text-align: inherit;
        text-align: -webkit-match-parent;
    }

    tbody,
    td,
    th,
    thead,
    tr {
        border-color: inherit;
        border-style: solid;
        border-width: 0;
    }

    @media (min-width:768px) {
        .col-md-3 {
            flex: 0 0 auto;
            width: 25%;
        }

        .col-md-6 {
            flex: 0 0 auto;
            width: 50%;
        }
    }

    .table {
        --bs-table-color: var(--bs-body-color);
        --bs-table-bg: transparent;
        --bs-table-border-color: var(--bs-border-color);
        --bs-table-accent-bg: transparent;
        --bs-table-striped-color: var(--bs-body-color);
        --bs-table-striped-bg: rgba(0, 0, 0, 0.05);
        --bs-table-active-color: var(--bs-body-color);
        --bs-table-active-bg: rgba(0, 0, 0, 0.1);
        --bs-table-hover-color: var(--bs-body-color);
        --bs-table-hover-bg: rgba(0, 0, 0, 0.075);
        width: 100%;
        margin-bottom: 1rem;
        color: var(--bs-table-color);
        vertical-align: top;
        border-color: var(--bs-table-border-color);
    }

    .table>:not(caption)>*>* {
        padding: .5rem .5rem;
        background-color: var(--bs-table-bg);
        border-bottom-width: 1px;
        box-shadow: inset 0 0 0 9999px var(--bs-table-accent-bg);
    }

    .table>tbody {
        vertical-align: inherit;
    }

    .table>thead {
        vertical-align: bottom;
    }

    .table-bordered>:not(caption)>* {
        border-width: 1px 0;
    }

    .table-bordered>:not(caption)>*>* {
        border-width: 0 1px;
    }

    .w-50 {
        width: 50% !important;
    }

    .mt-4 {
        margin-top: 1.5rem !important;
    }

    .mb-2 {
        margin-bottom: .5rem !important;
    }

    .fw-normal {
        font-weight: 400 !important;
    }

    .fw-bold {
        font-weight: 700 !important;
    }

    .lh-1 {
        line-height: 1 !important;
    }

    .text-center {
        text-align: center !important;
    }

    .text-white {
        --bs-text-opacity: 1;
        color: rgba(var(--bs-white-rgb), var(--bs-text-opacity)) !important;
    }

    .bg-dark {
        --bs-bg-opacity: 1;
        background-color: rgba(var(--bs-dark-rgb), var(--bs-bg-opacity)) !important;
    }

    *,
    ::after,
    ::before {
        box-sizing: border-box;
    }

    h6 {
        margin-top: 0;
        margin-bottom: .5rem;
    }

    address {
        margin-bottom: 1rem;
        font-style: normal;
        line-height: inherit;
    }

    strong {
        font-weight: bolder;
    }

    img {
        vertical-align: middle;
        border-style: none;
    }

    table {
        border-collapse: collapse;
    }

    th {
        text-align: inherit;
    }

    h6 {
        margin-bottom: .5rem;
        font-family: inherit;
        font-weight: 500;
        line-height: 1.2;
        color: inherit;
    }

    h6 {
        font-size: 1rem;
    }

    .col-md-3,
    .col-md-6 {
        position: relative;
        width: 100%;
        min-height: 1px;
        padding-right: 15px;
        padding-left: 15px;
    }

    @media (min-width:768px) {
        .col-md-3 {
            -ms-flex: 0 0 25%;
            flex: 0 0 25%;
            max-width: 25%;
        }

        .col-md-6 {
            -ms-flex: 0 0 50%;
            flex: 0 0 50%;
            max-width: 50%;
        }
    }

    .table {
        width: 100%;
        max-width: 100%;
        margin-bottom: 1rem;
        background-color: transparent;
    }

    .table td,
    .table th {
        padding: .75rem;
        vertical-align: top;
        border-top: 1px solid #dee2e6;
    }

    .table thead th {
        vertical-align: bottom;
        border-bottom: 2px solid #dee2e6;
    }

    .table-bordered {
        border: 1px solid #dee2e6;
    }

    .table-bordered td,
    .table-bordered th {
        border: 1px solid #dee2e6;
    }

    .table-bordered thead th {
        border-bottom-width: 2px;
    }

    .bg-dark {
        background-color: #343a40 !important;
    }

    .w-50 {
        width: 50% !important;
    }

    .mb-2 {
        margin-bottom: .5rem !important;
    }

    .mt-4 {
        margin-top: 1.5rem !important;
    }

    .text-right {
        text-align: right !important;
    }

    .text-center {
        text-align: center !important;
    }

    .text-white {
        color: #fff !important;
    }

    @media print {

        *,
        ::after,
        ::before {
            text-shadow: none !important;
            box-shadow: none !important;
        }

        thead {
            display: table-header-group;
        }

        img,
        tr {
            page-break-inside: avoid;
        }

        .table {
            border-collapse: collapse !important;
        }

        .table td,
        .table th {
            background-color: #fff !important;
        }

        .table-bordered td,
        .table-bordered th {
            border: 1px solid #dee2e6 !important;
        }
    }

    *,
    ::before,
    ::after {
        background-repeat: no-repeat;
        box-sizing: inherit;
    }

    ::before,
    ::after {
        text-decoration: inherit;
        vertical-align: inherit;
    }

    * {
        padding: 0;
        margin: 0;
    }

    strong {
        font-weight: bolder;
    }

    img {
        border-style: none;
    }

    .col-md-6,
    .col-md-3 {
        width: 100%;
        padding: 12px;
    }

    @media (min-width: 960px) {
        .col-md-3 {
            flex: 0 0 25%;
            max-width: 25%;
        }

        .col-md-6 {
            flex: 0 0 50%;
            max-width: 50%;
        }
    }

    table {
        font-family: Roboto !important;
    }

    *,
    ::before,
    ::after {
        background-repeat: no-repeat;
        box-sizing: inherit;
    }

    ::before,
    ::after {
        text-decoration: inherit;
        vertical-align: inherit;
    }

    * {
        padding: 0;
        margin: 0;
    }

    strong {
        font-weight: bolder;
    }

    img {
        border-style: none;
    }

    .col-md-6,
    .col-md-3 {
        width: 100%;
        padding: 12px;
    }

    @media (min-width: 960px) {
        .col-md-3 {
            flex: 0 0 25%;
            max-width: 25%;
        }

        .col-md-6 {
            flex: 0 0 50%;
            max-width: 50%;
        }
    }

    .addressheight {
        height: 50px;
    }

    td,
    th {
        text-align: left;
        padding: 8px;
    }
</style>

</html>
