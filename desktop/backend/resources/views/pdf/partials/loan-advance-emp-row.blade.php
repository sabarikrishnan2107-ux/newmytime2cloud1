<div class="emp">
  <div class="emp-avatar">
    @if($employee->profile_picture)
      <img src="{{ $employee->profile_picture }}" alt="">
    @else
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg>
    @endif
  </div>
  <div class="emp-info">
    <div class="emp-name">{{ $empFullName }}</div>
    <div class="emp-line1">ID: {{ $employee->employee_id ?? '---' }} <span class="emp-sep">·</span> {{ $statementLabel }} #{{ $stmtNo }}</div>
    <div class="emp-line2">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      {{ $deptName }}
      <span class="emp-sep">·</span>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
      {{ $branchName }}
    </div>
  </div>
  <div>
    <span class="pill pill-{{ strtolower($statusKey ?: 'active') }}">{{ ucfirst($statusKey ?: 'active') }}</span>
  </div>
</div>
