<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Loan & Advance Statement - {{ $employee->display_name ?? $employee->first_name }}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif; color: #1f2937; background: #f1f5f9; padding: 24px 0; font-weight: 400; -webkit-font-smoothing: antialiased; }
  .page { max-width: 820px; margin: 0 auto 28px; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 18px rgba(15,23,42,0.06); border: 1px solid #e5e7eb; }

  /* Header */
  .header { padding: 24px 32px 20px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .logo-tile { width: 56px; height: 56px; background: #0f1d3a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 26px; border-radius: 10px; position: relative; }
  .logo-tile::after { content: ''; width: 9px; height: 9px; background: #f59e0b; border-radius: 50%; position: absolute; top: 7px; right: 7px; }
  .brand-name { font-size: 19px; font-weight: 500; color: #0f172a; line-height: 1; letter-spacing: 0.3px; }
  .brand-tag { font-size: 12px; color: #f59e0b; font-style: italic; margin-top: 5px; font-weight: 500; }
  .head-right { text-align: right; }
  .head-title { font-size: 28px; font-weight: 500; color: #0f1d3a; letter-spacing: -0.5px; line-height: 1; }
  .head-meta { display: flex; justify-content: flex-end; gap: 38px; margin-top: 14px; font-size: 12px; }
  .head-meta .label { color: #64748b; font-weight: 400; }
  .head-meta .value { color: #0f172a; font-weight: 500; margin-top: 3px; }

  /* Employee */
  .emp { margin: 18px 32px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; }
  .emp-avatar { width: 50px; height: 50px; border-radius: 50%; background: #e2e8f0; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .emp-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .emp-info { flex: 1; }
  .emp-name { font-size: 17px; font-weight: 500; color: #0f172a; line-height: 1.1; }
  .emp-meta { font-size: 12px; color: #64748b; margin-top: 5px; font-weight: 500; }
  .emp-meta .dot { color: #cbd5e1; padding: 0 5px; }
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 999px; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
  .pill::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .pill-active { color: #16a34a; background: #dcfce7; }
  .pill-completed { color: #2563eb; background: #dbeafe; }
  .pill-cancelled { color: #64748b; background: #f1f5f9; }

  /* Stats */
  .stats { display: flex; gap: 12px; padding: 8px 32px 12px; }
  .stat { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .stat-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .stat-icon.blue { background: #dbeafe; color: #2563eb; }
  .stat-icon.green { background: #dcfce7; color: #16a34a; }
  .stat-icon.purple { background: #ede9fe; color: #7c3aed; }
  .stat-label { font-size: 10px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
  .stat-value { font-size: 22px; font-weight: 500; color: #0f172a; margin-top: 4px; line-height: 1.1; }
  .stat-value .ccy { font-size: 11px; color: #64748b; font-weight: 500; margin-left: 4px; }
  .stat-value.purple { color: #7c3aed; }
  .stat-sub { font-size: 11px; color: #94a3b8; margin-top: 4px; font-weight: 500; }

  /* Recovery */
  .recovery { margin: 0 32px 12px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; }
  .recovery-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .recovery-title { font-size: 11px; color: #0f1d3a; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }
  .recovery-pct { font-size: 18px; font-weight: 500; color: #0f1d3a; }
  .recovery-sub { font-size: 11px; color: #64748b; font-weight: 500; }
  .progress-track { height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin: 10px 0 4px; }
  .progress-fill { height: 100%; background: #2563eb; border-radius: 999px; }
  .progress-scale { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px; font-weight: 500; }

  /* Two-col cards */
  .two-col { display: flex; gap: 12px; padding: 0 32px 12px; }
  .info-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .info-head { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 500; color: #0f1d3a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  .info-head-icon { width: 22px; height: 22px; border-radius: 6px; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; }
  .info-head-icon.purple { background: #ede9fe; color: #7c3aed; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 12.5px; }
  .info-row .l { color: #64748b; font-weight: 500; }
  .info-row .v { color: #0f172a; font-weight: 500; }

  /* Schedule */
  .sched-head { padding: 4px 32px 8px; }
  .sched-title { font-size: 15px; font-weight: 500; color: #0f1d3a; letter-spacing: -0.2px; }
  .sched-sub { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 500; }
  .sched-sub .em { color: #2563eb; font-weight: 500; }
  .sched-wrap { margin: 0 32px 16px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .sched-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .sched-table thead { background: #0f1d3a; color: #fff; }
  .sched-table th { padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.8px; }
  .sched-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 500; text-align: center; }
  .sched-table tr:nth-child(even) td { background: #f8fafc; }
  .sched-table tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 4px 14px; border-radius: 6px; font-size: 10.5px; font-weight: 500; letter-spacing: 0.5px; min-width: 96px; }
  .badge-paid { background: #dcfce7; color: #16a34a; }
  .badge-next { background: #2563eb; color: #fff; }
  .badge-upcoming { background: #f1f5f9; color: #64748b; }

  /* Totals */
  .totals { display: flex; gap: 12px; padding: 0 32px 14px; }
  .total-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
  .total-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .total-icon.blue { background: #dbeafe; color: #2563eb; }
  .total-icon.purple { background: #ede9fe; color: #7c3aed; }
  .total-info .t-label { font-size: 10px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }
  .total-info .t-value { font-size: 17px; font-weight: 500; color: #0f172a; margin-top: 3px; line-height: 1.1; }
  .total-info .t-value .ccy { font-size: 11px; color: #64748b; font-weight: 500; margin-left: 3px; }

  /* Remarks */
  .remarks { margin: 0 32px 14px; padding: 12px 16px; border: 1px solid #fde68a; background: #fffbeb; border-radius: 10px; display: flex; align-items: flex-start; gap: 10px; }
  .remarks-icon { width: 26px; height: 26px; border-radius: 50%; background: #fde68a; color: #b45309; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 500; font-size: 14px; line-height: 1; }
  .remarks-label { font-size: 11px; font-weight: 500; color: #b45309; text-transform: uppercase; letter-spacing: 1px; }
  .remarks-body { font-size: 12px; color: #78350f; margin-top: 3px; line-height: 1.5; font-weight: 500; }

  /* Footer */
  .footer { padding: 12px 32px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; font-weight: 500; }
  .footer-left { display: flex; align-items: center; gap: 8px; }
  .hex { width: 18px; height: 20px; background: #16a34a; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); flex-shrink: 0; }

  .empty-block { margin: 6px 32px 18px; padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; text-align: center; color: #94a3b8; font-size: 12px; }

  @media print {
    body { background: #fff; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { box-shadow: none; max-width: 100%; border-radius: 0; border: none; margin: 0; }
    .page + .page { page-break-before: always; }
    @page { margin: 16mm; size: A4; }
  }
</style>
</head>
<body>

@php
  $currency = $currency ?? 'AED';
  $companyName = $employee->company->name ?? 'MyTime2Cloud';
  $companyTagline = $employee->company->tagline ?? 'Hospitality Redefined';
  $genStamp = now()->format('j M Y, H:i');
  $statementDate = now()->format('j F Y');
  $branchName = optional($employee->branch)->branch_name ?? '---';
  $deptName = optional($employee->department)->name ?? '---';
  $logoLetter = strtoupper(substr($companyName, 0, 1));
  $empFullName = trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? '')) ?: ($employee->display_name ?? '---');
  $stmtCounter = 0;
@endphp

{{-- =================== LOAN STATEMENTS =================== --}}
@foreach($loans as $loan)
  @php
    $stmtCounter++;
    $totalInst = $loan->monthly_installment > 0 ? max(1, (int) ceil($loan->loan_amount / $loan->monthly_installment)) : 1;
    $paidSoFar = (float) ($loan->loan_amount - $loan->outstanding_balance);
    $paidInst = $loan->monthly_installment > 0 ? (int) round($paidSoFar / $loan->monthly_installment) : 0;
    $leftInst = max(0, $totalInst - $paidInst);
    $paidPct = $loan->loan_amount > 0 ? round(($paidSoFar / $loan->loan_amount) * 100) : 0;
    $deductions = $loanDeductions->get($loan->id, collect());
    $deductionsByMonth = $deductions->keyBy('payroll_month');
    $lastDeduction = $deductions->sortByDesc('deducted_at')->first();
    $startCarbon = $loan->start_month ? \Carbon\Carbon::parse($loan->start_month . '-01') : now()->startOfMonth();
    $nextDeductionLabel = $leftInst > 0 && $loan->status === 'active'
        ? ($lastDeduction ? \Carbon\Carbon::parse($lastDeduction->payroll_month . '-01')->addMonth()->format('M Y') : $startCarbon->format('M Y'))
        : 'Completed';
    $loanStatus = strtolower($loan->status ?? 'active');
  @endphp

  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo-tile">{{ $logoLetter }}</div>
        <div>
          <div class="brand-name">{{ strtoupper($companyName) }}</div>
          @if($companyTagline)<div class="brand-tag">{{ $companyTagline }}</div>@endif
        </div>
      </div>
      <div class="head-right">
        <div class="head-title">LOAN STATEMENT</div>
        <div class="head-meta">
          <div><div class="label">Date</div><div class="value">{{ $statementDate }}</div></div>
          <div><div class="label">Statement #</div><div class="value">{{ $stmtCounter }}</div></div>
        </div>
      </div>
    </div>

    <div class="emp">
      <div class="emp-avatar">
        @if($employee->profile_picture)<img src="{{ $employee->profile_picture }}" alt="">@else<svg width="26" height="26" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg>@endif
      </div>
      <div class="emp-info">
        <div class="emp-name">{{ $empFullName }}</div>
        <div class="emp-meta">Employee ID <span class="dot">·</span> {{ $employee->employee_id ?? '---' }}</div>
        <div class="emp-meta">{{ $deptName }} <span class="dot">·</span> {{ $branchName }}</div>
      </div>
      <div><span class="pill pill-{{ $loanStatus }}">{{ ucfirst($loanStatus) }}</span></div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-icon blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <div class="stat-label">Total Loan</div>
        <div class="stat-value">{{ number_format($loan->loan_amount, 0) }} <span class="ccy">{{ $currency }}</span></div>
        <div class="stat-sub">Principal amount</div>
      </div>
      <div class="stat">
        <div class="stat-icon green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h4.5a2 2 0 0 1 0 4H9"/></svg></div>
        <div class="stat-label">Paid So Far</div>
        <div class="stat-value">{{ number_format($paidSoFar, 0) }} <span class="ccy">{{ $currency }}</span></div>
        <div class="stat-sub">{{ $paidPct }}% of total</div>
      </div>
      <div class="stat">
        <div class="stat-icon purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg></div>
        <div class="stat-label">Outstanding</div>
        <div class="stat-value purple">{{ number_format($loan->outstanding_balance, 0) }} <span class="ccy">{{ $currency }}</span></div>
        <div class="stat-sub">{{ $leftInst }} {{ Str::plural('installment', $leftInst) }} left</div>
      </div>
    </div>

    <div class="recovery">
      <div class="recovery-head">
        <div><div class="recovery-title">Recovery Progress</div><div class="recovery-sub">{{ $paidInst }} of {{ $totalInst }} {{ Str::plural('installment', $totalInst) }} recovered</div></div>
        <div class="recovery-pct">{{ $paidPct }}%</div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width: {{ $paidPct }}%"></div></div>
      <div class="progress-scale"><span>0%</span><span>100%</span></div>
    </div>

    <div class="two-col">
      <div class="info-card">
        <div class="info-head"><div class="info-head-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg></div>Payment Schedule</div>
        <div class="info-row"><span class="l">Monthly Installment</span><span class="v">{{ number_format($loan->monthly_installment, 0) }} {{ $currency }}</span></div>
        <div class="info-row"><span class="l">Loan Period</span><span class="v">{{ $loan->start_month ? \Carbon\Carbon::parse($loan->start_month . '-01')->format('M Y') : '---' }} – {{ $loan->end_month ? \Carbon\Carbon::parse($loan->end_month . '-01')->format('M Y') : '---' }}</span></div>
        <div class="info-row"><span class="l">Last Deduction</span><span class="v">{{ $lastDeduction ? \Carbon\Carbon::parse($lastDeduction->payroll_month . '-01')->format('M Y') : 'Not started' }}</span></div>
        <div class="info-row"><span class="l">Next Deduction</span><span class="v">{{ $nextDeductionLabel }}</span></div>
      </div>
      <div class="info-card">
        <div class="info-head"><div class="info-head-icon purple"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/><polyline points="9 12 11 14 15 10"/></svg></div>Loan Summary</div>
        <div class="info-row"><span class="l">Status</span><span class="v"><span class="pill pill-{{ $loanStatus }}">{{ ucfirst($loanStatus) }}</span></span></div>
        <div class="info-row"><span class="l">Total Installments</span><span class="v">{{ $totalInst }}</span></div>
        <div class="info-row"><span class="l">Installments Paid</span><span class="v">{{ $paidInst }}</span></div>
        <div class="info-row"><span class="l">Installments Left</span><span class="v">{{ $leftInst }}</span></div>
      </div>
    </div>

    <div class="sched-head">
      <div class="sched-title">DEDUCTION SCHEDULE</div>
      <div class="sched-sub">{{ $totalInst }} monthly deductions <span style="color:#cbd5e1">·</span> Total <span class="em">{{ number_format($loan->loan_amount, 0) }} {{ $currency }}</span></div>
    </div>

    <div class="sched-wrap">
      <table class="sched-table">
        <thead><tr><th style="width:60px">#</th><th>MONTH</th><th style="width:140px">STATUS</th><th style="width:150px">AMOUNT ({{ $currency }})</th></tr></thead>
        <tbody>
          @php $nextMarked = false; @endphp
          @for($i = 0; $i < $totalInst; $i++)
            @php
              $m = $startCarbon->copy()->addMonths($i);
              $rec = $deductionsByMonth->get($m->format('Y-m'));
              if ($rec) { $b = 'paid'; $sl = 'PAID'; $amt = $rec->amount; }
              elseif (!$nextMarked && $loan->status === 'active') { $b = 'next'; $sl = 'NEXT'; $amt = min($loan->monthly_installment, $loan->outstanding_balance); $nextMarked = true; }
              else { $b = 'upcoming'; $sl = 'UPCOMING'; $amt = $loan->monthly_installment; }
            @endphp
            <tr><td>{{ $i + 1 }}</td><td>{{ $m->format('M Y') }}</td><td><span class="badge badge-{{ $b }}">{{ $sl }}</span></td><td>{{ number_format($amt, 0) }}</td></tr>
          @endfor
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="total-card">
        <div class="total-icon blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="6" y2="18"/><line x1="10" y1="4" x2="10" y2="20"/><line x1="14" y1="6" x2="14" y2="18"/><line x1="18" y1="4" x2="18" y2="20"/></svg></div>
        <div class="total-info"><div class="t-label">Total Deducted So Far</div><div class="t-value">{{ number_format($paidSoFar, 0) }} <span class="ccy">{{ $currency }}</span></div></div>
      </div>
      <div class="total-card">
        <div class="total-icon purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="2.5"/><path d="M4 6v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V6"/><path d="M4 11v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-5"/></svg></div>
        <div class="total-info"><div class="t-label">Scheduled Lifetime Total</div><div class="t-value">{{ number_format($loan->loan_amount, 0) }} <span class="ccy">{{ $currency }}</span></div></div>
      </div>
    </div>

    <div class="remarks">
      <div class="remarks-icon">!</div>
      <div><div class="remarks-label">Remarks</div><div class="remarks-body">{{ $loan->remarks ?: 'No remarks recorded.' }}</div></div>
    </div>

    <div class="footer">
      <div class="footer-left"><div class="hex"></div><span>{{ $companyName }} <span style="color:#cbd5e1">·</span> Confidential document</span></div>
      <div>Generated {{ $genStamp }}</div>
      <div>Page 1 of 1</div>
    </div>
  </div>
@endforeach

{{-- =================== ADVANCE STATEMENTS =================== --}}
@foreach($advances as $advance)
  @php
    $stmtCounter++;
    $advTotalInst = $advance->monthly_recovery > 0 ? max(1, (int) ceil($advance->advance_amount / $advance->monthly_recovery)) : 1;
    $advPaidSoFar = (float) ($advance->advance_amount - $advance->outstanding_balance);
    $advPaidInst = $advance->monthly_recovery > 0 ? (int) round($advPaidSoFar / $advance->monthly_recovery) : 0;
    $advLeftInst = max(0, $advTotalInst - $advPaidInst);
    $advPct = $advance->advance_amount > 0 ? round(($advPaidSoFar / $advance->advance_amount) * 100) : 0;
    $advDeductions = $advanceDeductions->get($advance->id, collect());
    $advByMonth = $advDeductions->keyBy('payroll_month');
    $advLast = $advDeductions->sortByDesc('deducted_at')->first();
    $advIssue = $advance->issue_date ? \Carbon\Carbon::parse($advance->issue_date) : now();
    $advStartCarbon = $advIssue->copy()->startOfMonth();
    $advNextLabel = $advLeftInst > 0 && $advance->status === 'active'
        ? ($advLast ? \Carbon\Carbon::parse($advLast->payroll_month . '-01')->addMonth()->format('M Y') : $advStartCarbon->format('M Y'))
        : 'Completed';
    $advStatus = strtolower($advance->status ?? 'active');
  @endphp

  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo-tile">{{ $logoLetter }}</div>
        <div>
          <div class="brand-name">{{ strtoupper($companyName) }}</div>
          @if($companyTagline)<div class="brand-tag">{{ $companyTagline }}</div>@endif
        </div>
      </div>
      <div class="head-right">
        <div class="head-title">ADVANCE STATEMENT</div>
        <div class="head-meta">
          <div><div class="label">Date</div><div class="value">{{ $statementDate }}</div></div>
          <div><div class="label">Statement #</div><div class="value">{{ $stmtCounter }}</div></div>
        </div>
      </div>
    </div>

    <div class="emp">
      <div class="emp-avatar">
        @if($employee->profile_picture)<img src="{{ $employee->profile_picture }}" alt="">@else<svg width="26" height="26" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg>@endif
      </div>
      <div class="emp-info">
        <div class="emp-name">{{ $empFullName }}</div>
        <div class="emp-meta">Employee ID <span class="dot">·</span> {{ $employee->employee_id ?? '---' }}</div>
        <div class="emp-meta">{{ $deptName }} <span class="dot">·</span> {{ $branchName }}</div>
      </div>
      <div><span class="pill pill-{{ $advStatus }}">{{ ucfirst($advStatus) }}</span></div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-icon blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h4.5a2 2 0 0 1 0 4H9"/></svg></div>
        <div class="stat-label">Advance Amount</div>
        <div class="stat-value">{{ number_format($advance->advance_amount, 0) }} <span class="ccy">{{ $currency }}</span></div>
        <div class="stat-sub">Issued {{ $advIssue->format('d M Y') }}</div>
      </div>
      <div class="stat">
        <div class="stat-icon green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="stat-label">Recovered</div>
        <div class="stat-value">{{ number_format($advPaidSoFar, 0) }} <span class="ccy">{{ $currency }}</span></div>
        <div class="stat-sub">{{ $advPct }}% of total</div>
      </div>
      <div class="stat">
        <div class="stat-icon purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></svg></div>
        <div class="stat-label">Outstanding</div>
        <div class="stat-value purple">{{ number_format($advance->outstanding_balance, 0) }} <span class="ccy">{{ $currency }}</span></div>
        <div class="stat-sub">{{ $advLeftInst }} {{ Str::plural('recovery', $advLeftInst) }} left</div>
      </div>
    </div>

    <div class="recovery">
      <div class="recovery-head"><div><div class="recovery-title">Recovery Progress</div><div class="recovery-sub">{{ $advPaidInst }} of {{ $advTotalInst }} {{ Str::plural('recovery', $advTotalInst) }} completed</div></div><div class="recovery-pct">{{ $advPct }}%</div></div>
      <div class="progress-track"><div class="progress-fill" style="width: {{ $advPct }}%"></div></div>
      <div class="progress-scale"><span>0%</span><span>100%</span></div>
    </div>

    <div class="two-col">
      <div class="info-card">
        <div class="info-head"><div class="info-head-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg></div>Recovery Schedule</div>
        <div class="info-row"><span class="l">Monthly Recovery</span><span class="v">{{ number_format($advance->monthly_recovery, 0) }} {{ $currency }}</span></div>
        <div class="info-row"><span class="l">Issue Date</span><span class="v">{{ $advIssue->format('d M Y') }}</span></div>
        <div class="info-row"><span class="l">Last Recovery</span><span class="v">{{ $advLast ? \Carbon\Carbon::parse($advLast->payroll_month . '-01')->format('M Y') : 'Not started' }}</span></div>
        <div class="info-row"><span class="l">Next Recovery</span><span class="v">{{ $advNextLabel }}</span></div>
      </div>
      <div class="info-card">
        <div class="info-head"><div class="info-head-icon purple"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Advance Summary</div>
        <div class="info-row"><span class="l">Status</span><span class="v"><span class="pill pill-{{ $advStatus }}">{{ ucfirst($advStatus) }}</span></span></div>
        <div class="info-row"><span class="l">Total Recoveries</span><span class="v">{{ $advTotalInst }}</span></div>
        <div class="info-row"><span class="l">Recoveries Paid</span><span class="v">{{ $advPaidInst }}</span></div>
        <div class="info-row"><span class="l">Recoveries Left</span><span class="v">{{ $advLeftInst }}</span></div>
      </div>
    </div>

    <div class="sched-head">
      <div class="sched-title">RECOVERY SCHEDULE</div>
      <div class="sched-sub">{{ $advTotalInst }} monthly recoveries <span style="color:#cbd5e1">·</span> Total <span class="em">{{ number_format($advance->advance_amount, 0) }} {{ $currency }}</span></div>
    </div>

    <div class="sched-wrap">
      <table class="sched-table">
        <thead><tr><th style="width:60px">#</th><th>MONTH</th><th style="width:140px">STATUS</th><th style="width:150px">AMOUNT ({{ $currency }})</th></tr></thead>
        <tbody>
          @php $advNextMarked = false; @endphp
          @for($i = 0; $i < $advTotalInst; $i++)
            @php
              $m = $advStartCarbon->copy()->addMonths($i);
              $rec = $advByMonth->get($m->format('Y-m'));
              if ($rec) { $b = 'paid'; $sl = 'PAID'; $amt = $rec->amount; }
              elseif (!$advNextMarked && $advance->status === 'active') { $b = 'next'; $sl = 'NEXT'; $amt = min($advance->monthly_recovery, $advance->outstanding_balance); $advNextMarked = true; }
              else { $b = 'upcoming'; $sl = 'UPCOMING'; $amt = $advance->monthly_recovery; }
            @endphp
            <tr><td>{{ $i + 1 }}</td><td>{{ $m->format('M Y') }}</td><td><span class="badge badge-{{ $b }}">{{ $sl }}</span></td><td>{{ number_format($amt, 0) }}</td></tr>
          @endfor
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="total-card">
        <div class="total-icon blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="6" y2="18"/><line x1="10" y1="4" x2="10" y2="20"/><line x1="14" y1="6" x2="14" y2="18"/><line x1="18" y1="4" x2="18" y2="20"/></svg></div>
        <div class="total-info"><div class="t-label">Total Recovered So Far</div><div class="t-value">{{ number_format($advPaidSoFar, 0) }} <span class="ccy">{{ $currency }}</span></div></div>
      </div>
      <div class="total-card">
        <div class="total-icon purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="2.5"/><path d="M4 6v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V6"/><path d="M4 11v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-5"/></svg></div>
        <div class="total-info"><div class="t-label">Scheduled Lifetime Total</div><div class="t-value">{{ number_format($advance->advance_amount, 0) }} <span class="ccy">{{ $currency }}</span></div></div>
      </div>
    </div>

    <div class="remarks">
      <div class="remarks-icon">!</div>
      <div><div class="remarks-label">Remarks</div><div class="remarks-body">{{ $advance->remarks ?: 'No remarks recorded.' }}</div></div>
    </div>

    <div class="footer">
      <div class="footer-left"><div class="hex"></div><span>{{ $companyName }} <span style="color:#cbd5e1">·</span> Confidential document</span></div>
      <div>Generated {{ $genStamp }}</div>
      <div>Page 1 of 1</div>
    </div>
  </div>
@endforeach

@if($loans->isEmpty() && $advances->isEmpty())
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo-tile">{{ $logoLetter }}</div>
        <div><div class="brand-name">{{ strtoupper($companyName) }}</div>@if($companyTagline)<div class="brand-tag">{{ $companyTagline }}</div>@endif</div>
      </div>
      <div class="head-right"><div class="head-title">LOAN STATEMENT</div></div>
    </div>
    <div class="empty-block">No loans or advances recorded for this employee.</div>
    <div class="footer">
      <div class="footer-left"><div class="hex"></div><span>{{ $companyName }} <span style="color:#cbd5e1">·</span> Confidential document</span></div>
      <div>Generated {{ $genStamp }}</div>
      <div>Page 1 of 1</div>
    </div>
  </div>
@endif

</body>
</html>
