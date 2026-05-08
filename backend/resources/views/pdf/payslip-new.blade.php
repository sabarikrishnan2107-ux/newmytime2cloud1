<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Payslip - {{ $record->employee->employee_id ?? '' }} - {{ $record->month }}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif; color: #1f2937; background: #f3f4f6; padding: 20px 0; font-weight: 400; }
  .page { max-width: 820px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.08); }

  /* Header */
  .header { background: linear-gradient(135deg, #0a3d62 0%, #1e5f8e 100%); color: #fff; padding: 30px 38px 38px; position: relative; overflow: hidden; }
  .header .wave { position: absolute; right: -40px; bottom: -60px; width: 320px; height: 200px; background: rgba(255,255,255,0.06); border-radius: 50%; }
  .header .wave2 { position: absolute; right: 80px; bottom: -90px; width: 240px; height: 200px; background: rgba(255,255,255,0.04); border-radius: 50%; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 2; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
  .brand h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.3px; line-height: 1; }
  .brand .sub { font-size: 13px; opacity: 0.9; margin-top: 6px; font-weight: 400; }
  .confidential { font-size: 10px; text-transform: uppercase; letter-spacing: 2.5px; border: 1px solid rgba(255,255,255,0.45); padding: 6px 14px; border-radius: 4px; font-weight: 500; }

  /* Section Card with Icon Heading */
  .section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .section-head .icon-circle { width: 30px; height: 30px; border-radius: 50%; background: #dbeafe; display: flex; align-items: center; justify-content: center; }
  .section-head h3 { font-size: 13px; font-weight: 600; color: #0a3d62; text-transform: uppercase; letter-spacing: 1.2px; }

  /* Employee & Payment Details */
  .details { display: flex; gap: 30px; padding: 28px 38px 18px; }
  .details .col { flex: 1; }
  .details .row { display: flex; padding: 7px 0; font-size: 12.5px; align-items: center; }
  .details .row .label { color: #6b7280; flex: 1; font-weight: 400; }
  .details .row .colon { color: #9ca3af; padding: 0 14px; }
  .details .row .value { font-weight: 500; color: #1f2937; flex: 1.2; text-align: right; }
  .details .row .value.status { color: #ea7c1c; text-transform: uppercase; }
  .details .row .value.status-paid { color: #16a34a; }

  /* Attendance Summary */
  .attendance { margin: 6px 38px 18px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 18px; background: #fafbfc; }
  .att-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .att-head .label { font-size: 11px; font-weight: 600; color: #0a3d62; text-transform: uppercase; letter-spacing: 1.2px; }
  .att-stats { display: flex; gap: 0; flex-wrap: wrap; align-items: center; }
  .att-stat { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 95px; padding: 0 14px; border-left: 1px solid #e5e7eb; }
  .att-stat:first-child { border-left: none; padding-left: 0; }
  .att-icon { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .att-icon.blue { background: #dbeafe; }
  .att-icon.red { background: #fee2e2; }
  .att-icon.orange { background: #fed7aa; }
  .att-icon.purple { background: #ede9fe; }
  .att-icon.teal { background: #ccfbf1; }
  .att-icon.green { background: #dcfce7; }
  .att-text .v { font-size: 14px; font-weight: 600; color: #1f2937; line-height: 1; }
  .att-text .l { font-size: 10.5px; color: #6b7280; margin-top: 2px; font-weight: 400; }

  /* Earnings & Deductions Tables */
  .tables { display: flex; gap: 18px; padding: 8px 38px 18px; }
  .tables .col { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
  .tables table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .tables th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #fff; }
  .tables .earnings th { background: #1e5f8e; }
  .tables .deductions th { background: #c0392b; }
  .tables th .ico { display: inline-block; vertical-align: middle; margin-right: 8px; }
  .tables th.amt { text-align: right; }
  .tables td { padding: 9px 16px; border-bottom: 1px solid #f3f4f6; font-weight: 400; }
  .tables td:last-child { text-align: right; font-weight: 500; color: #1f2937; }
  .tables tr:last-child td { border-bottom: none; }
  .tables .total td { font-weight: 600; background: #f9fafb; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.5px; padding: 11px 16px; }
  .tables .earnings .total td { color: #1e5f8e; }
  .tables .deductions .total td { color: #c0392b; }
  .tables .zero td { color: #d1d5db; }

  /* Rate Calculation Card */
  .rate-card { margin: 6px 38px 18px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; }
  .rate-card .icon-circle { width: 36px; height: 36px; border-radius: 50%; background: #1e5f8e; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rate-card .content { flex: 1; }
  .rate-card .title { font-size: 11.5px; font-weight: 600; color: #0a3d62; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px; }
  .rate-card .body { font-size: 12px; color: #374151; line-height: 1.6; font-weight: 400; }
  .rate-card .body span { font-weight: 500; color: #1f2937; }

  /* Net Salary Band */
  .net-salary { margin: 6px 38px 24px; background: linear-gradient(135deg, #0a3d62 0%, #1e5f8e 100%); color: #fff; border-radius: 10px; padding: 22px 28px; display: flex; justify-content: space-between; align-items: center; position: relative; overflow: hidden; }
  .net-salary .ns-wave { position: absolute; left: 0; bottom: -40px; width: 100%; height: 80px; background: rgba(255,255,255,0.04); border-radius: 50% 50% 0 0; }
  .ns-left { display: flex; align-items: center; gap: 14px; position: relative; z-index: 2; }
  .ns-icon { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; }
  .ns-label { font-size: 17px; font-weight: 500; letter-spacing: 0.5px; padding-left: 16px; border-left: 1px solid rgba(255,255,255,0.3); }
  .ns-amount { font-size: 30px; font-weight: 600; letter-spacing: -0.5px; position: relative; z-index: 2; }

  /* Signatures */
  .signatures { display: flex; justify-content: space-between; padding: 16px 38px 24px; gap: 20px; }
  .sig { display: flex; align-items: center; gap: 12px; flex: 1; }
  .sig .icon-circle { width: 36px; height: 36px; border-radius: 50%; background: #f3f4f6; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sig .col { flex: 1; }
  .sig .line { border-top: 1px solid #d1d5db; margin-bottom: 6px; height: 18px; }
  .sig .title { font-size: 11px; color: #6b7280; text-align: center; }

  /* Footer */
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 12px 38px; }
  .footer .top-row { display: flex; align-items: center; justify-content: center; gap: 8px; }
  .footer .lock { width: 22px; height: 22px; border-radius: 50%; background: #fee2e2; display: inline-flex; align-items: center; justify-content: center; }
  .footer .text { font-size: 11px; color: #c0392b; }
  .footer .timestamp { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; font-weight: 400; letter-spacing: 0.3px; }
  .footer .timestamp svg { opacity: 0.7; }

  @media print {
    body { background: #fff; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { box-shadow: none; max-width: 100%; border-radius: 0; }
  }
</style>
</head>
<body>
<div class="page">

  @php
    $monthLabel = '---';
    try { $monthLabel = \Carbon\Carbon::parse($record->month . '-01')->format('F Y'); } catch(\Exception $e) {}
    $currency = $currency ?? 'AED';
    $daysInMonth = 30;
    try { $daysInMonth = \Carbon\Carbon::parse($record->month . '-01')->daysInMonth; } catch(\Exception $e) {}
    $dailyRate = $record->basic_salary > 0 ? round($record->basic_salary / $daysInMonth, 2) : 0;
    $companyName = $record->employee->company->name ?? 'MyTime2Cloud';
  @endphp

  <!-- Header -->
  <div class="header">
    <div class="wave"></div>
    <div class="wave2"></div>
    <div class="header-row">
      <div class="brand">
        <div class="brand-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.5 19a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 17.5 9a4 4 0 0 1 .5 7.97L6.5 19z" fill="#fff"/>
          </svg>
        </div>
        <div>
          <h1>{{ $companyName }}</h1>
          <div class="sub">Payslip for the Month of {{ $monthLabel }}</div>
        </div>
      </div>
      <div class="confidential">CONFIDENTIAL</div>
    </div>
  </div>

  <!-- Employee & Payment Details -->
  <div class="details">
    <div class="col">
      <div class="section-head">
        <div class="icon-circle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1e5f8e" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/>
          </svg>
        </div>
        <h3>Employee Details</h3>
      </div>
      <div class="row"><span class="label">Employee ID</span><span class="colon">:</span><span class="value">{{ $record->employee->employee_id ?? $record->employee_id }}</span></div>
      <div class="row"><span class="label">Employee Name</span><span class="colon">:</span><span class="value">{{ trim(($record->employee->first_name ?? '') . ' ' . ($record->employee->last_name ?? '')) ?: '---' }}</span></div>
      <div class="row"><span class="label">Department</span><span class="colon">:</span><span class="value">{{ $record->employee->department->name ?? '---' }}</span></div>
      <div class="row"><span class="label">Designation</span><span class="colon">:</span><span class="value">{{ $record->employee->designation->name ?? '---' }}</span></div>
      <div class="row"><span class="label">Branch</span><span class="colon">:</span><span class="value">{{ $record->employee->branch->branch_name ?? '---' }}</span></div>
    </div>
    <div class="col">
      <div class="section-head">
        <div class="icon-circle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1e5f8e" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6zm2 2v2h16V8H4zm0 4v6h16v-6H4zm2 3h6v1H6v-1z"/>
          </svg>
        </div>
        <h3>Payment Details</h3>
      </div>
      <div class="row"><span class="label">Payment Method</span><span class="colon">:</span><span class="value">Bank Transfer</span></div>
      <div class="row"><span class="label">Bank</span><span class="colon">:</span><span class="value">{{ $record->employee->bank->bank_name ?? '---' }}</span></div>
      <div class="row"><span class="label">IBAN</span><span class="colon">:</span><span class="value">{{ $record->employee->bank->account_no ?? '---' }}</span></div>
      <div class="row"><span class="label">Pay Period</span><span class="colon">:</span><span class="value">{{ $monthLabel }}</span></div>
      <div class="row"><span class="label">Status</span><span class="colon">:</span><span class="value status {{ $record->status === 'paid' ? 'status-paid' : '' }}">{{ $record->status }}</span></div>
    </div>
  </div>

  <!-- Attendance Summary -->
  <div class="attendance">
    <div class="att-head">
      <span class="label">Attendance Summary</span>
    </div>
    <div class="att-stats">
      <div class="att-stat">
        <div class="att-icon blue">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e5f8e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="att-text"><div class="v">{{ $record->present_days }}</div><div class="l">Present</div></div>
      </div>
      <div class="att-stat">
        <div class="att-icon red">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <div class="att-text"><div class="v">{{ $record->absent_days }}</div><div class="l">Absent</div></div>
      </div>
      <div class="att-stat">
        <div class="att-icon orange">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5"><circle cx="12" cy="12" r="9"/></svg>
        </div>
        <div class="att-text"><div class="v">{{ $record->late_days }}</div><div class="l">Late Days</div></div>
      </div>
      <div class="att-stat">
        <div class="att-icon purple">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
        </div>
        <div class="att-text"><div class="v">{{ $record->late_minutes ?? 0 }}</div><div class="l">Late Mins</div></div>
      </div>
      <div class="att-stat">
        <div class="att-icon teal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
        </div>
        <div class="att-text"><div class="v">{{ number_format($record->ot_hours, 2) }}</div><div class="l">OT Hrs</div></div>
      </div>
      @if(($record->paid_leave_days ?? 0) > 0)
      <div class="att-stat">
        <div class="att-icon green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="att-text"><div class="v">{{ $record->paid_leave_days }}</div><div class="l">Paid Leave</div></div>
      </div>
      @endif
    </div>
  </div>

  <!-- Earnings & Deductions Tables -->
  <div class="tables">
    <div class="col">
      <table class="earnings">
        <thead><tr>
          <th>
            <span class="ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="3" y="6" width="18" height="13" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>Earnings
          </th>
          <th class="amt">Amount ({{ $currency }})</th>
        </tr></thead>
        <tbody>
          <tr><td>Basic Salary</td><td>{{ number_format($record->basic_salary, 2) }}</td></tr>
          @if($record->house_allowance > 0)<tr><td>House Allowance</td><td>{{ number_format($record->house_allowance, 2) }}</td></tr>@endif
          @if($record->transport_allowance > 0)<tr><td>Transport Allowance</td><td>{{ number_format($record->transport_allowance, 2) }}</td></tr>@endif
          @if($record->food_allowance > 0)<tr><td>Food Allowance</td><td>{{ number_format($record->food_allowance, 2) }}</td></tr>@endif
          @if($record->medical_allowance > 0)<tr><td>Medical Allowance</td><td>{{ number_format($record->medical_allowance, 2) }}</td></tr>@endif
          @if($record->other_allowance > 0)<tr><td>Other Allowance</td><td>{{ number_format($record->other_allowance, 2) }}</td></tr>@endif
          @if($record->ot_amount > 0)<tr><td>Overtime ({{ $record->ot_hours }} hrs)</td><td>{{ number_format($record->ot_amount, 2) }}</td></tr>@endif
          @if($record->bonus > 0)<tr><td>Bonus</td><td>{{ number_format($record->bonus, 2) }}</td></tr>@endif
          @if($record->incentive > 0)<tr><td>Incentive</td><td>{{ number_format($record->incentive, 2) }}</td></tr>@endif
          @if($record->arrears > 0)<tr><td>Arrears</td><td>{{ number_format($record->arrears, 2) }}</td></tr>@endif
          @if($record->reimbursement > 0)<tr><td>Reimbursement</td><td>{{ number_format($record->reimbursement, 2) }}</td></tr>@endif
          <tr class="total"><td>Gross Earned</td><td>{{ number_format($record->gross_earned, 2) }}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="col">
      <table class="deductions">
        <thead><tr>
          <th>
            <span class="ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </span>Deductions
          </th>
          <th class="amt">Amount ({{ $currency }})</th>
        </tr></thead>
        <tbody>
          <tr class="{{ $record->absence_deduction == 0 ? 'zero' : '' }}"><td>Absence Deduction ({{ $record->absent_days }} days)</td><td>{{ number_format($record->absence_deduction, 2) }}</td></tr>
          @if(($record->leave_deduction ?? 0) > 0)
          <tr><td>Unpaid Leave ({{ $record->unpaid_leave_days }} days)</td><td>{{ number_format($record->leave_deduction, 2) }}</td></tr>
          @endif
          <tr class="{{ $record->late_deduction == 0 ? 'zero' : '' }}"><td>Late Deduction ({{ $record->late_days }} days)</td><td>{{ number_format($record->late_deduction, 2) }}</td></tr>
          <tr class="{{ $record->loan_deduction == 0 ? 'zero' : '' }}"><td>Loan Deduction</td><td>{{ number_format($record->loan_deduction, 2) }}</td></tr>
          <tr class="{{ $record->advance_deduction == 0 ? 'zero' : '' }}"><td>Advance Deduction</td><td>{{ number_format($record->advance_deduction, 2) }}</td></tr>
          @if($record->fine_amount > 0)<tr><td>Fine</td><td>{{ number_format($record->fine_amount, 2) }}</td></tr>@endif
          @if($record->other_deduction > 0)<tr><td>Other Deduction</td><td>{{ number_format($record->other_deduction, 2) }}</td></tr>@endif
          <tr class="total"><td>Total Deductions</td><td>{{ number_format($record->total_deduction, 2) }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Rate Calculation Card -->
  <div class="rate-card">
    <div class="icon-circle">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="14" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="14" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="14" y2="18"/></svg>
    </div>
    <div class="content">
      <div class="title">Rate Calculation</div>
      <div class="body">
        <span>Daily Rate:</span> {{ $currency }} {{ number_format($dailyRate, 2) }} (Basic {{ number_format($record->basic_salary, 2) }} / {{ $daysInMonth }} days)
        &nbsp;&bull;&nbsp;
        <span>Absence:</span> {{ $record->absent_days }} days &times; {{ number_format($dailyRate, 2) }} = {{ number_format($record->absence_deduction, 2) }}
        @if(($record->leave_deduction ?? 0) > 0)
        &nbsp;&bull;&nbsp;
        <span>Unpaid Leave:</span> {{ $record->unpaid_leave_days }} days &times; {{ number_format($dailyRate, 2) }} = {{ number_format($record->leave_deduction, 2) }}
        @endif
        @if($record->ot_amount > 0)
        &nbsp;&bull;&nbsp;
        <span>OT:</span> {{ $record->ot_hours }} hrs
        @endif
      </div>
    </div>
  </div>

  <!-- Net Salary Band -->
  <div class="net-salary">
    <div class="ns-wave"></div>
    <div class="ns-left">
      <div class="ns-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2 7 6h10l-2-4z"/><path d="M5 6h14l2 14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2L5 6z"/><path d="M12 11v6"/><path d="M10 13h4"/></svg>
      </div>
      <span class="ns-label">NET SALARY</span>
    </div>
    <span class="ns-amount">{{ $currency }} {{ number_format($record->net_salary, 2) }}</span>
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig">
      <div class="icon-circle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg>
      </div>
      <div class="col">
        <div class="line"></div>
        <div class="title">Prepared By</div>
      </div>
    </div>
    <div class="sig">
      <div class="icon-circle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e5f8e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/><polyline points="9 12 11 14 15 10"/></svg>
      </div>
      <div class="col">
        <div class="line"></div>
        <div class="title">Approved By</div>
      </div>
    </div>
    <div class="sig">
      <div class="icon-circle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
      </div>
      <div class="col">
        <div class="line"></div>
        <div class="title">Received By</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="top-row">
      <span class="lock">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
      </span>
      <span class="text">This is a system-generated payslip. For any queries, please contact the HR department.</span>
    </div>
    <div class="timestamp">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
      <span>Generated on {{ now()->format('d M Y, h:i A') }}</span>
    </div>
  </div>

</div>
</body>
</html>
