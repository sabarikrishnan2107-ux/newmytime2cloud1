"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Plus, Landmark, HandCoins, X, Edit, Trash, Search, RotateCcw, Wallet, CheckCircle, AlertCircle, Calendar, TrendingUp, Building2, Briefcase, MapPin, Download } from "lucide-react";
import DateRangeSelect from "@/components/ui/DateRange";
import MonthPicker from "@/components/ui/MonthPicker";
import { getUser } from "@/config";
import { getCompanyLogo as fetchCompanyLogo, getCompanyProfile } from "@/lib/endpoint/company";
import { useTranslation } from "react-i18next";

const emptyLoanForm = { employee_id: "", loan_amount: "", monthly_installment: "", start_month: "", end_month: "", remarks: "" };
const emptyAdvForm = { employee_id: "", advance_amount: "", monthly_recovery: "", issue_date: "", remarks: "" };

const PHOTO_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://v2backend.mytime2cloud.com/api").replace(/\/api\/?$/, "");

function CircularProgress({ percent = 0, size = 140, stroke = 12, gradientFrom = "#6366f1", gradientTo = "#3b82f6", labelTop, labelBottom, gradientId }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(Math.max(percent, 0), 100) / 100) * c;
  const id = gradientId || `circProg-${gradientFrom}-${gradientTo}`.replace(/[^a-z0-9]/gi, "");
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-gray-200 dark:text-gray-800" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.7s ease-in-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {labelTop && <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{labelTop}</div>}
        <div className="text-3xl font-extrabold tabular-nums" style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{percent}%</div>
        {labelBottom && <div className="text-[10px] text-gray-400 mt-0.5">{labelBottom}</div>}
      </div>
    </div>
  );
}

function getCompanyName() {
  try {
    if (typeof window === "undefined") return "MyTime2Cloud";
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    // Try company-specific fields ONLY (skip u.name which is the user's own name)
    return u.company?.name || u.company_name || u.companyName || "MyTime2Cloud";
  } catch { return "MyTime2Cloud"; }
}

function getCompanyLogo() {
  try {
    if (typeof window === "undefined") return null;
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const raw = u.logo || u.company_logo || u.company?.logo;
    if (!raw) return null;
    if (typeof raw !== "string") return null;
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
    return `${PHOTO_BASE}/media/company/logo/${raw}`;
  } catch { return null; }
}

function printLoanOrAdvance({ kind, item, employee, totalInstallments, installmentsPaid, installmentsLeft, paidPercent, lastDeduction, nextDeduction, monthLabelOf, companyLogoUrl, companyName: companyNameOverride }) {
  // Prefer the employee's own company (more accurate per-record), fall back to logged-in user's company
  const employeeCompany =
    employee?.company?.name ||
    employee?.company_name ||
    item?.employee?.company?.name ||
    item?.employee?.company_name;
  const companyName = employeeCompany || companyNameOverride || getCompanyName();

  // Same priority for logo: employee's company logo first, then logged-in user's
  const employeeCompanyLogoRaw =
    employee?.company?.logo ||
    item?.employee?.company?.logo;
  const employeeCompanyLogo = employeeCompanyLogoRaw
    ? (typeof employeeCompanyLogoRaw === "string" && (employeeCompanyLogoRaw.startsWith("http") || employeeCompanyLogoRaw.startsWith("data:"))
        ? employeeCompanyLogoRaw
        : `${PHOTO_BASE}/media/company/logo/${employeeCompanyLogoRaw}`)
    : null;

  const companyLogo = employeeCompanyLogo || companyLogoUrl || getCompanyLogo();
  const isLoan = kind === "loan";
  const totalAmount = isLoan ? item.loanAmount : item.advanceAmount;
  const monthlyAmount = isLoan ? item.monthlyInstallment : item.monthlyRecovery;
  const totalPaid = totalAmount - item.outstandingBalance;
  const heading = isLoan ? "Loan Statement" : "Advance Statement";
  const recoveryLabel = isLoan ? "Paid So Far" : "Recovered";
  const monthlyLabel = isLoan ? "Monthly Installment" : "Monthly Recovery";
  const periodValue = isLoan ? `${item.startMonth} → ${item.endMonth}` : item.issueDate;
  const accent = isLoan ? "#6366f1" : "#f59e0b";
  const accent2 = isLoan ? "#3b82f6" : "#f97316";
  const heroPic = resolvePhoto(employee) || resolvePhoto(item.employee);

  // Circular progress geometry (matches 120px ring with 12px stroke)
  const r = 48, c = 2 * Math.PI * r, off = c - (paidPercent / 100) * c;

  const scheduleCards = Array.from({ length: totalInstallments }, (_, i) => {
    const isPaid = i < installmentsPaid;
    const isNext = i === installmentsPaid && installmentsLeft > 0;
    const bg = isPaid ? "#ecfdf5" : isNext ? "#fffbeb" : "#f9fafb";
    const border = isPaid ? "#a7f3d0" : isNext ? "#fde68a" : "#e5e7eb";
    const badgeBg = isPaid ? "#10b981" : isNext ? "#f59e0b" : "#e5e7eb";
    const badgeColor = (isPaid || isNext) ? "#fff" : "#9ca3af";
    const labelColor = isPaid ? "#059669" : isNext ? "#d97706" : "#9ca3af";
    const labelText = isPaid ? "Deducted" : isNext ? "Next Deduction" : "Upcoming";
    const valColor = isPaid ? "#047857" : isNext ? "#b45309" : "#6b7280";
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${bg};border:1px solid ${border}">
        <div style="width:28px;height:28px;border-radius:50%;background:${badgeBg};color:${badgeColor};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${isPaid ? "✓" : i + 1}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:600;color:#111827">${monthLabelOf(i)}</div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:${labelColor}">${labelText}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:${valColor}">${monthlyAmount.toLocaleString()}</div>
      </div>`;
  }).join("");

  const avatar = heroPic
    ? `<img src="${heroPic}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;flex-shrink:0" />`
    : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,${accent},${accent2});color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;border:2px solid #e5e7eb;flex-shrink:0">${(item.employeeName || "?").charAt(0).toUpperCase()}</div>`;

  const html = `<!DOCTYPE html><html><head><title>${heading} - ${item.employeeName || "Employee"}</title>
    <style>
      @page { size: A4; margin: 0; }
      *{margin:0;padding:0;box-sizing:border-box;font-weight:400}
      body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;color:#1f2937;background:#f3f4f6;padding:20px;font-weight:400}
      .page{max-width:780px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.08)}
      h2,h3,h4{font-weight:600}
      strong,b{font-weight:500}

      .hero{padding:24px 32px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;gap:16px}
      .hero-left{display:flex;align-items:center;gap:18px}
      .hero h2{font-size:20px;font-weight:800;color:#111827}
      .hero .id-line{font-size:12px;color:#6b7280;margin-top:4px}
      .hero .chips{display:flex;gap:14px;margin-top:8px;font-size:11px;color:#6b7280}
      .hero .chips span{display:flex;align-items:center;gap:5px}
      .doc-stamp{padding:8px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700}

      .body{padding:18px 24px;background:#f9fafb}

      .stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
      .stat-card{position:relative;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;overflow:hidden}
      .stat-card .accent{position:absolute;top:0;left:0;right:0;height:3px}
      .stat-card .icon-box{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:16px}
      .stat-card .stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1.1px;font-weight:500;color:#6b7280;margin-bottom:3px}
      .stat-card .stat-value{font-size:20px;font-weight:600;color:#111827}
      .stat-card .stat-sub{font-size:10px;color:#9ca3af;margin-top:3px;font-weight:400}
      .stat-card.blue .accent{background:linear-gradient(90deg,#60a5fa,#2563eb)}
      .stat-card.blue .icon-box{background:#dbeafe;color:#2563eb}
      .stat-card.green .accent{background:linear-gradient(90deg,#34d399,#059669)}
      .stat-card.green .icon-box{background:#d1fae5;color:#059669}
      .stat-card.green .stat-value{color:#059669}
      .stat-card.red .accent{background:linear-gradient(90deg,#fb7185,#dc2626)}
      .stat-card.red .icon-box{background:#fee2e2;color:#dc2626}
      .stat-card.red .stat-value{color:#dc2626}

      .panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:12px}
      .panel-head{display:flex;align-items:center;gap:8px;margin-bottom:12px}
      .panel-head .icon-bg{width:28px;height:28px;border-radius:7px;background:${accent}1a;color:${accent};display:flex;align-items:center;justify-content:center;font-size:13px}
      .panel-head .titles h4{font-size:13px;font-weight:600;color:#111827}
      .panel-head .titles p{font-size:10px;color:#9ca3af;margin-top:2px;font-weight:400}

      .progress-row{display:flex;align-items:center;gap:18px}
      .ring-wrap{position:relative;width:120px;height:120px;flex-shrink:0}
      .ring-wrap svg{transform:rotate(-90deg)}
      .ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
      .ring-center .top-l{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:500}
      .ring-center .pct{font-size:22px;font-weight:600;color:${accent}}
      .ring-center .bot-l{font-size:9px;color:#9ca3af;margin-top:2px;font-weight:400}
      .ring-side{flex:1;display:flex;flex-direction:column;gap:8px}
      .side-card{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:8px;border:1px solid #e5e7eb}
      .side-card.green{background:#ecfdf5;border-color:#a7f3d0}
      .side-card.amber{background:#fffbeb;border-color:#fde68a}
      .side-card .ico-sm{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px}
      .side-card.green .ico-sm{background:#d1fae5;color:#059669}
      .side-card.amber .ico-sm{background:#fef3c7;color:#d97706}
      .side-card .lbl{font-size:9px;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;font-weight:500}
      .side-card.green .val{font-size:14px;font-weight:600;color:#059669}
      .side-card.amber .val{font-size:14px;font-weight:600;color:#d97706}

      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
      .info-row{display:flex;justify-content:space-between;align-items:center;padding:8px 11px;border-radius:7px;font-size:12px}
      .info-row + .info-row{margin-top:3px}
      .info-row .lbl{color:#6b7280;font-weight:400}
      .info-row .val{font-weight:500;color:#111827}
      .info-row.hl-green{background:#ecfdf5;border:1px solid #a7f3d0}
      .info-row.hl-green .val{color:#047857}
      .info-row.hl-amber{background:#fffbeb;border:1px solid #fde68a}
      .info-row.hl-amber .val{color:#b45309}
      .badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:500}
      .badge.green{background:#d1fae5;color:#047857}
      .badge.gray{background:#e5e7eb;color:#6b7280}
      .badge .dot{width:6px;height:6px;border-radius:50%}
      .badge.green .dot{background:#10b981}
      .badge.gray .dot{background:#9ca3af}

      .schedule-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .legend{display:flex;gap:14px;font-size:10px;margin-bottom:10px}
      .legend span{display:flex;align-items:center;gap:5px}
      .legend .ld{width:8px;height:8px;border-radius:50%}

      .footer{padding:10px 24px;text-align:center;font-size:9px;color:#9ca3af;background:#fff;border-top:1px solid #e5e7eb}
      @media print{
        @page { size: A4; margin: 8mm; }
        html,body { background:#fff !important; padding:0 !important; margin:0 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
        .page { box-shadow:none !important; border-radius:0 !important; max-width:100% !important; width:100% !important; margin:0 !important; }
        body, body * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
        .body { padding:14px 18px !important; background:#f9fafb !important; }
        .panel { padding:12px !important; margin-bottom:10px !important; page-break-inside:avoid; }
        .two-col { gap:10px !important; margin-bottom:10px !important; page-break-inside:avoid; }
        .stat-row { gap:10px !important; margin-bottom:12px !important; page-break-inside:avoid; }
        .stat-card { padding:12px !important; }
        .stat-card .stat-value { font-size:18px !important; }
        .stat-card .icon-box { width:34px !important; height:34px !important; font-size:15px !important; margin-bottom:6px !important; }
        .schedule-grid { gap:6px !important; }
        h2 { font-size:18px !important; }
        .panel-head { margin-bottom:12px !important; }
        .ring-wrap { width:110px !important; height:110px !important; }
        .ring-center .pct { font-size:22px !important; }
        .info-row { padding:7px 10px !important; font-size:11px !important; }
        .info-row + .info-row { margin-top:3px !important; }
      }
    </style></head><body>
    <div class="page">
      <div style="background:linear-gradient(135deg,${accent},${accent2});color:#fff;padding:20px 32px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:14px">
          ${companyLogo
            ? `<img src="${companyLogo}" alt="${companyName} logo" crossorigin="anonymous" style="width:60px;height:60px;border-radius:12px;object-fit:contain;background:#fff;padding:6px;border:2px solid rgba(255,255,255,0.3)" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div style="display:none;width:60px;height:60px;border-radius:12px;background:rgba(255,255,255,0.25);align-items:center;justify-content:center;font-size:26px;font-weight:600;border:2px solid rgba(255,255,255,0.3)">${(companyName || "?").charAt(0).toUpperCase()}</div>`
            : `<div style="width:60px;height:60px;border-radius:12px;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:600;border:2px solid rgba(255,255,255,0.3)">${(companyName || "?").charAt(0).toUpperCase()}</div>`}
          <div>
            <div style="font-size:22px;font-weight:600;letter-spacing:0.3px">${companyName}</div>
            <div style="font-size:11px;opacity:0.9;letter-spacing:1.4px;text-transform:uppercase;margin-top:4px;font-weight:500">${heading}</div>
          </div>
        </div>
        <div style="text-align:right;font-size:11px;opacity:0.95">
          <div style="font-weight:500">${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</div>
          <div style="opacity:0.85;margin-top:3px;letter-spacing:0.5px;font-weight:400">${heading} #${item.id}</div>
        </div>
      </div>

      <div style="padding:18px 32px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;gap:14px">
        <div style="display:flex;align-items:center;gap:14px">
          ${heroPic
            ? `<img src="${heroPic}" alt="${item.employeeName}" crossorigin="anonymous" style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div style="display:none;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,${accent},${accent2});color:#fff;align-items:center;justify-content:center;font-size:22px;font-weight:600;border:2px solid #e5e7eb">${(item.employeeName || "?").charAt(0).toUpperCase()}</div>`
            : `<div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,${accent},${accent2});color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:600;border:2px solid #e5e7eb">${(item.employeeName || "?").charAt(0).toUpperCase()}</div>`}
          <div>
            <div style="font-size:18px;font-weight:600;color:#111827">${item.employeeName}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:3px;font-weight:400">ID: ${item.employeeId} · ${heading} #${item.id}</div>
            <div style="display:flex;gap:14px;margin-top:6px;font-size:10px;color:#6b7280;font-weight:400">
              ${employee?.department?.name ? `<span><strong style="color:#111827;font-weight:500">📋</strong> ${employee.department.name}</span>` : ""}
              ${(employee?.designation?.name && employee.designation.name !== "---") ? `<span><strong style="color:#111827;font-weight:500">💼</strong> ${employee.designation.name}</span>` : ""}
              ${employee?.branch?.branch_name ? `<span><strong style="color:#111827;font-weight:500">📍</strong> ${employee.branch.branch_name}</span>` : ""}
            </div>
          </div>
        </div>
        <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:99px;background:${item.status === "active" ? "#d1fae5" : "#e5e7eb"};color:${item.status === "active" ? "#047857" : "#6b7280"};font-weight:500;font-size:10px;letter-spacing:0.8px">
          <span style="width:7px;height:7px;border-radius:50%;background:${item.status === "active" ? "#10b981" : "#9ca3af"}"></span>${(item.status || "").toUpperCase()}
        </span>
      </div>

      <div class="body">
        <div class="stat-row">
          <div class="stat-card blue">
            <div class="accent"></div>
            <div class="icon-box">💰</div>
            <div class="stat-label">${isLoan ? "Total Loan" : "Total Advance"}</div>
            <div class="stat-value">${totalAmount.toLocaleString()}</div>
          </div>
          <div class="stat-card green">
            <div class="accent"></div>
            <div class="icon-box">✓</div>
            <div class="stat-label">${recoveryLabel}</div>
            <div class="stat-value">${totalPaid.toLocaleString()}</div>
            <div class="stat-sub">${paidPercent}% of total</div>
          </div>
          <div class="stat-card red">
            <div class="accent"></div>
            <div class="icon-box">⚠</div>
            <div class="stat-label">Outstanding</div>
            <div class="stat-value">${item.outstandingBalance.toLocaleString()}</div>
            <div class="stat-sub">${installmentsLeft} ${isLoan ? "installments" : "recoveries"} left</div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div class="icon-bg">📈</div>
            <div class="titles">
              <h4>Recovery Progress</h4>
              <p>Tracking ${isLoan ? "installment" : "advance"} recovery</p>
            </div>
          </div>
          <div class="progress-row">
            <div class="ring-wrap">
              <svg width="120" height="120">
                <circle cx="60" cy="60" r="${r}" stroke="#e5e7eb" stroke-width="10" fill="none" />
                <circle cx="60" cy="60" r="${r}" stroke="${accent}" stroke-width="10" stroke-linecap="round" fill="none"
                  stroke-dasharray="${c}" stroke-dashoffset="${off}" />
              </svg>
              <div class="ring-center">
                <div class="top-l">Recovered</div>
                <div class="pct">${paidPercent}%</div>
                <div class="bot-l">of total</div>
              </div>
            </div>
            <div class="ring-side">
              <div class="side-card green">
                <div class="ico-sm">✓</div>
                <div style="flex:1"><div class="lbl">${isLoan ? "Paid" : "Recovered"}</div><div class="val">${installmentsPaid} <span style="color:#9ca3af;font-size:11px;font-weight:400">/ ${totalInstallments}</span></div></div>
              </div>
              <div class="side-card amber">
                <div class="ico-sm">⏱</div>
                <div style="flex:1"><div class="lbl">Remaining</div><div class="val">${installmentsLeft} <span style="color:#9ca3af;font-size:11px;font-weight:400">${isLoan ? "installments" : "recoveries"}</span></div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="two-col">
          <div class="panel" style="margin-bottom:0">
            <div class="panel-head">
              <div class="icon-bg" style="background:#dbeafe;color:#2563eb">📅</div>
              <div class="titles"><h4>${isLoan ? "Payment" : "Recovery"} Schedule</h4></div>
            </div>
            <div class="info-row"><span class="lbl">${monthlyLabel}</span><span class="val">${monthlyAmount.toLocaleString()}</span></div>
            <div class="info-row"><span class="lbl">${isLoan ? "Loan Period" : "Issue Date"}</span><span class="val">${periodValue}</span></div>
            <div class="info-row hl-green"><span class="lbl">● Last Deduction</span><span class="val">${lastDeduction}</span></div>
            <div class="info-row hl-amber"><span class="lbl">● Next Deduction</span><span class="val">${nextDeduction}</span></div>
          </div>

          <div class="panel" style="margin-bottom:0">
            <div class="panel-head">
              <div class="icon-bg" style="background:#d1fae5;color:#059669">✓</div>
              <div class="titles"><h4>${isLoan ? "Loan" : "Advance"} Summary</h4></div>
            </div>
            <div class="info-row"><span class="lbl">Status</span>
              <span class="badge ${item.status === "active" ? "green" : "gray"}"><span class="dot"></span>${(item.status || "").toUpperCase()}</span>
            </div>
            <div class="info-row"><span class="lbl">Total ${isLoan ? "Installments" : "Recoveries"}</span><span class="val">${totalInstallments}</span></div>
            <div class="info-row"><span class="lbl">${isLoan ? "Installments Paid" : "Recoveries Done"}</span><span class="val" style="color:#059669">${installmentsPaid}</span></div>
            <div class="info-row"><span class="lbl">${isLoan ? "Installments Left" : "Recoveries Left"}</span><span class="val" style="color:#d97706">${installmentsLeft}</span></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div class="icon-bg" style="background:${accent}1a;color:${accent}">📅</div>
            <div class="titles"><h4>${isLoan ? "Deduction" : "Recovery"} Schedule</h4><p>${totalInstallments} monthly ${isLoan ? "deductions" : "recoveries"}</p></div>
          </div>
          <div class="legend">
            <span><span class="ld" style="background:#10b981"></span><span style="color:#059669;font-weight:600">${isLoan ? "Paid" : "Recovered"}</span></span>
            <span><span class="ld" style="background:#f59e0b"></span><span style="color:#d97706;font-weight:600">Next</span></span>
            <span><span class="ld" style="background:#d1d5db"></span><span style="color:#6b7280">Upcoming</span></span>
          </div>
          <div class="schedule-grid">${scheduleCards}</div>
          <div style="margin-top:14px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:11px">
            <span style="color:#6b7280">Total ${isLoan ? "Deducted" : "Recovered"} So Far</span>
            <span style="font-weight:700;color:#059669">${(installmentsPaid * monthlyAmount).toLocaleString()}</span>
          </div>
        </div>

        ${item.remarks ? `<div class="panel" style="margin-bottom:0"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:3px;height:14px;background:${accent};border-radius:99px"></div><h4 style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:700">Remarks</h4></div><p style="font-size:13px;color:#374151;line-height:1.6;padding-left:13px">${item.remarks}</p></div>` : ""}
      </div>

      <div class="footer">Generated on ${new Date().toLocaleString()}</div>
    </div>
  </body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function resolvePhoto(employee) {
  if (!employee) return null;
  const p = employee.profile_picture || employee.profile_picture_raw;
  if (!p) return null;
  if (typeof p !== "string") return null;
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;
  return `${PHOTO_BASE}/media/employee/profile_picture/${p}`;
}

export default function LoansAdvances() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("loans");
  const [loanDialog, setLoanDialog] = useState(false);
  const [advDialog, setAdvDialog] = useState(false);
  const [loans, setLoans] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loanForm, setLoanForm] = useState(emptyLoanForm);
  const [advForm, setAdvForm] = useState(emptyAdvForm);

  useEffect(() => {
    const amt = parseFloat(loanForm.loan_amount);
    const inst = parseFloat(loanForm.monthly_installment);
    if (!loanForm.start_month || !amt || !inst || inst <= 0) return;
    const months = Math.ceil(amt / inst);
    if (months < 1) return;
    const [y, m] = loanForm.start_month.split("-").map(Number);
    if (!y || !m) return;
    const d = new Date(y, m - 1 + (months - 1), 1);
    const computed = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (computed !== loanForm.end_month) {
      setLoanForm(prev => ({ ...prev, end_month: computed }));
    }
  }, [loanForm.loan_amount, loanForm.monthly_installment, loanForm.start_month]);
  const [saving, setSaving] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [editingAdvId, setEditingAdvId] = useState(null);
  const [viewLoan, setViewLoan] = useState(null);
  const [viewAdv, setViewAdv] = useState(null);
  const [loanMode, setLoanMode] = useState("table"); // table | detail
  const [advMode, setAdvMode] = useState("table");

  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);
  const [companyName, setCompanyName] = useState("MyTime2Cloud");

  useEffect(() => {
    // 1) Try cached user company fields first (instant)
    try {
      const u = getUser?.() || {};
      const cachedName = u?.company?.name || u?.company_name || u?.companyName;
      if (cachedName) setCompanyName(cachedName);
      const directLogo = u?.company?.logo || u?.company_logo;
      if (directLogo && typeof directLogo === "string") {
        if (directLogo.startsWith("http") || directLogo.startsWith("data:")) {
          setCompanyLogoUrl(directLogo);
        } else {
          setCompanyLogoUrl(`${PHOTO_BASE}/media/company/logo/${directLogo}`);
        }
      }
    } catch {}

    // 2) Fetch full company profile (authoritative source for name + logo)
    const resolveLogoString = (raw) => {
      if (!raw || typeof raw !== "string") return null;
      const v = raw.trim();
      if (!v) return null;
      if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:")) return v;
      // Some backends return raw base64 without the data: prefix
      if (/^[A-Za-z0-9+/=]+$/.test(v) && v.length > 200) return `data:image/png;base64,${v}`;
      return `${PHOTO_BASE}/media/company/logo/${v}`;
    };

    (async () => {
      try {
        const c = await getCompanyProfile();
        if (c?.name) setCompanyName(c.name);
        const candidate = c?.logo || c?.logo_base_64 || c?.image;
        const resolved = resolveLogoString(candidate);
        if (resolved) setCompanyLogoUrl(resolved);
      } catch {}

      // 3) Also try the dedicated logo endpoint (fallback if profile didn't have logo)
      try {
        const data = await fetchCompanyLogo();
        const raw = typeof data === "string"
          ? data
          : (data?.logo || data?.logo_base_64 || data?.data?.logo || data?.url || data?.path || data?.image);
        const resolved = resolveLogoString(raw);
        if (resolved) setCompanyLogoUrl(resolved);
      } catch {}
    })();
  }, []);

  // Filter state (separate from dialog state)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selBranch, setSelBranch] = useState("");
  const [selDept, setSelDept] = useState("");

  const fetchLoans = async () => {
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/payroll-management/loans", { params: { ...params, per_page: 100 } });
      setLoans((data?.data || []).map(l => ({
        ...l,
        employeeName: l.employee ? `${l.employee.first_name} ${l.employee.last_name || ""}`.trim() : `Emp ${l.employee_id}`,
        employeeId: String(l.employee?.employee_id || l.employee_id),
        loanAmount: parseFloat(l.loan_amount) || 0,
        monthlyInstallment: parseFloat(l.monthly_installment) || 0,
        outstandingBalance: parseFloat(l.outstanding_balance) || 0,
        startMonth: l.start_month || "---",
        endMonth: l.end_month || "---",
      })));
    } catch (e) {}
  };

  const fetchAdvances = async () => {
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/payroll-management/advances", { params: { ...params, per_page: 100 } });
      setAdvances((data?.data || []).map(a => ({
        ...a,
        employeeName: a.employee ? `${a.employee.first_name} ${a.employee.last_name || ""}`.trim() : `Emp ${a.employee_id}`,
        employeeId: String(a.employee?.employee_id || a.employee_id),
        advanceAmount: parseFloat(a.advance_amount) || 0,
        monthlyRecovery: parseFloat(a.monthly_recovery) || 0,
        outstandingBalance: parseFloat(a.outstanding_balance) || 0,
        issueDate: a.issue_date || "---",
      })));
    } catch (e) {}
  };

  useEffect(() => {
    fetchLoans();
    fetchAdvances();
    const fetchEmployees = async () => {
      try {
        const params = await buildQueryParams({});
        const { data } = await api.get("/payroll-management/employees", { params });
        setEmployees(data || []);
        const bMap = {}, dMap = {};
        (data || []).forEach(e => {
          if (e.branch) bMap[e.branch.id] = e.branch.branch_name;
          if (e.department) dMap[e.department.id] = { name: e.department.name, branchId: e.branch_id };
        });
        setBranches(Object.entries(bMap).map(([id, name]) => ({ id, name })));
        setDepartments(Object.entries(dMap).map(([id, v]) => ({ id, name: v.name, branchId: v.branchId })));
      } catch (e) {}
    };
    fetchEmployees();
  }, []);

  const filtDepts = selBranch ? departments.filter(d => String(d.branchId) === String(selBranch)) : departments;
  const filtEmps = employees.filter(e => {
    if (selBranch && String(e.branch_id) !== String(selBranch)) return false;
    if (selDept && String(e.department_id) !== String(selDept)) return false;
    return true;
  });

  // Filter-row dropdowns (use filter state, not dialog state)
  const filterDepts = filterBranch ? departments.filter(d => String(d.branchId) === String(filterBranch)) : departments;
  const filterEmps = employees.filter(e => {
    if (filterBranch && String(e.branch_id) !== String(filterBranch)) return false;
    if (filterDept && String(e.department_id) !== String(filterDept)) return false;
    return true;
  });

  // Apply filters to a row (works for loans and advances)
  const matchesFilters = (row, dateField) => {
    const q = searchQuery.trim().toLowerCase();
    if (q && !(`${row.employeeName} ${row.employeeId}`.toLowerCase().includes(q))) return false;

    const emp = employees.find(e => String(e.id) === String(row.employee_id));
    if (filterBranch && emp && String(emp.branch_id) !== String(filterBranch)) return false;
    if (filterDept && emp && String(emp.department_id) !== String(filterDept)) return false;
    if (filterEmployee && String(row.employee_id) !== String(filterEmployee)) return false;

    if (filterFrom || filterTo) {
      const raw = row[dateField] || "";
      if (raw) {
        const rowDate = String(raw).length >= 10 ? String(raw).slice(0, 10) : `${raw}-01`;
        if (filterFrom && rowDate < filterFrom) return false;
        if (filterTo && rowDate > filterTo) return false;
      }
    }
    return true;
  };

  const displayedLoans = loans.filter(l => matchesFilters(l, "start_month"));
  const displayedAdvances = advances.filter(a => matchesFilters(a, "issue_date"));

  // In detail mode: keep the selected loan/advance valid (or pick first)
  useEffect(() => {
    if (loanMode !== "detail") return;
    if (displayedLoans.length > 0 && (!viewLoan || !displayedLoans.find(l => l.id === viewLoan.id))) {
      setViewLoan(displayedLoans[0]);
    } else if (displayedLoans.length === 0) {
      setViewLoan(null);
    }
  }, [loans, loanMode, searchQuery, filterBranch, filterDept, filterEmployee, filterFrom, filterTo]);

  useEffect(() => {
    if (advMode !== "detail") return;
    if (displayedAdvances.length > 0 && (!viewAdv || !displayedAdvances.find(a => a.id === viewAdv.id))) {
      setViewAdv(displayedAdvances[0]);
    } else if (displayedAdvances.length === 0) {
      setViewAdv(null);
    }
  }, [advances, advMode, searchQuery, filterBranch, filterDept, filterEmployee, filterFrom, filterTo]);

  const clearFilters = () => {
    setSearchQuery(""); setFilterBranch(""); setFilterDept("");
    setFilterEmployee(""); setFilterFrom(""); setFilterTo("");
  };

  const BranchDeptEmpFilter = ({ formValue, onEmpChange }) => (
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">{t("payroll.common.branch")}</label>
        <select value={selBranch} onChange={e => { setSelBranch(e.target.value); setSelDept(""); onEmpChange(""); }}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <option value="">{t("payroll.common.allBranches")}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">{t("payroll.common.department")}</label>
        <select value={selDept} onChange={e => { setSelDept(e.target.value); onEmpChange(""); }}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <option value="">{t("payroll.common.allDepartments")}</option>
          {filtDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">{t("payroll.common.employee")}</label>
        <select value={formValue} onChange={e => {
          const empId = e.target.value;
          onEmpChange(empId);
          if (empId) {
            const picked = employees.find(emp => String(emp.id) === String(empId));
            if (picked) {
              if (picked.branch_id) setSelBranch(String(picked.branch_id));
              if (picked.department_id) setSelDept(String(picked.department_id));
            }
          }
        }}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <option value="">{t("payroll.common.selectEmployee")}</option>
          {filtEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name || ""}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t("payroll.loans.title")}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("payroll.loans.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-white/10">
        <button onClick={() => setActiveTab("loans")} className={`pb-3 text-xs font-bold flex items-center gap-1.5 transition ${activeTab === "loans" ? "border-b-2 border-primary text-primary" : "text-gray-400 hover:text-gray-600"}`}>
          <Landmark className="h-3.5 w-3.5" /> {t("payroll.loans.loansTab")}
        </button>
        <button onClick={() => setActiveTab("advances")} className={`pb-3 text-xs font-bold flex items-center gap-1.5 transition ${activeTab === "advances" ? "border-b-2 border-primary text-primary" : "text-gray-400 hover:text-gray-600"}`}>
          <HandCoins className="h-3.5 w-3.5" /> {t("payroll.loans.advancesTab")}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <select value={filterBranch} onChange={e => { setFilterBranch(e.target.value); setFilterDept(""); setFilterEmployee(""); }}
          className="rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-400 dark:hover:border-white/20 transition cursor-pointer min-w-[140px]">
          <option value="">{t("payroll.common.branch")}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterEmployee(""); }}
          className="rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-400 dark:hover:border-white/20 transition cursor-pointer min-w-[160px]">
          <option value="">{t("payroll.common.department")}</option>
          {filterDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select value={filterEmployee} onChange={e => {
          const empId = e.target.value;
          setFilterEmployee(empId);
          if (empId) {
            const picked = employees.find(emp => String(emp.id) === String(empId));
            if (picked) {
              if (picked.branch_id) setFilterBranch(String(picked.branch_id));
              if (picked.department_id) setFilterDept(String(picked.department_id));
            }
          }
        }}
          className="rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-400 dark:hover:border-white/20 transition cursor-pointer min-w-[160px]">
          <option value="">{t("payroll.common.employees")}</option>
          {filterEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name || ""}</option>)}
        </select>

        <div className="rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 shadow-sm overflow-hidden [&>div]:!border-0 [&_button]:!rounded-full">
          <DateRangeSelect
            value={{ from: filterFrom, to: filterTo }}
            onChange={({ from, to }) => { setFilterFrom(from || ""); setFilterTo(to || ""); }}
          />
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder={t("payroll.register.searchEmpId")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-10 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition" />
        </div>

        {(searchQuery || filterBranch || filterDept || filterEmployee || filterFrom || filterTo) && (
          <button onClick={clearFilters} title={t("payroll.loans.clearAllFilters")}
            className="rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 p-2.5 text-gray-500 hover:text-red-500 hover:border-red-300 shadow-sm transition">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Loans Tab */}
      {activeTab === "loans" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            {loanMode === "detail" ? (
              <button onClick={() => { setLoanMode("table"); setViewLoan(null); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                ← {t("payroll.loans.backToList")}
              </button>
            ) : <span />}
            <button onClick={() => { setEditingLoanId(null); setLoanForm(emptyLoanForm); setLoanDialog(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
              <Plus className="h-3.5 w-3.5" /> {t("payroll.loans.addLoan")}
            </button>
          </div>

          {/* TABLE MODE */}
          {loanMode === "table" && (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-4">{t("payroll.common.employee")}</th>
                      <th className="px-3 py-4">{t("payroll.loans.loanAmount")}</th>
                      <th className="px-3 py-4">{t("payroll.loans.installment")}</th>
                      <th className="px-3 py-4">{t("payroll.loans.outstanding")}</th>
                      <th className="px-3 py-4">{t("payroll.loans.period")}</th>
                      <th className="px-3 py-4 min-w-[160px]">{t("payroll.loans.recovered")}</th>
                      <th className="px-3 py-4">{t("payroll.common.status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {displayedLoans.map(l => {
                      const paidPercent = l.loanAmount > 0 ? Math.round(((l.loanAmount - l.outstandingBalance) / l.loanAmount) * 100) : 0;
                      const emp = employees.find(e => String(e.id) === String(l.employee_id));
                      const pic = resolvePhoto(emp) || resolvePhoto(l.employee);
                      return (
                        <tr key={l.id} onClick={() => { setViewLoan(l); setLoanMode("detail"); }}
                          className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {pic ? (
                                <img src={pic} alt={l.employeeName} onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0" />
                              ) : null}
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white items-center justify-center font-semibold text-sm shrink-0 ${pic ? "hidden" : "flex"}`}>
                                {l.employeeName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{l.employeeName}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{t("payroll.fields.id")}: {l.employeeId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm font-semibold tabular-nums">{l.loanAmount.toLocaleString()}</td>
                          <td className="px-3 py-4 text-sm tabular-nums">{l.monthlyInstallment.toLocaleString()}</td>
                          <td className="px-3 py-4 text-sm font-semibold text-red-500 tabular-nums">{l.outstandingBalance.toLocaleString()}</td>
                          <td className="px-3 py-4 text-sm whitespace-nowrap">{l.startMonth} - {l.endMonth}</td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 min-w-[60px] rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${paidPercent}%` }}></div>
                              </div>
                              <span className="text-xs text-gray-500 w-9 text-right font-medium">{paidPercent}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${l.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>{l.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {displayedLoans.length === 0 && (
                      <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400 text-sm">
                        {loans.length === 0 ? t("payroll.loans.noLoans") : t("payroll.loans.noLoansMatch")}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DETAIL MODE */}
          {loanMode === "detail" && (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[600px]">
            {/* Left list */}
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("payroll.loans.loansCount", { count: displayedLoans.length })}</h3>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[640px]">
                {displayedLoans.length === 0 && (
                  <div className="px-4 py-10 text-center text-gray-400 text-sm">
                    {loans.length === 0 ? t("payroll.loans.noLoansYet") : t("payroll.loans.noMatches")}
                  </div>
                )}
                {displayedLoans.map(l => {
                  const isActive = viewLoan?.id === l.id;
                  const emp = employees.find(e => String(e.id) === String(l.employee_id));
                  const pic = resolvePhoto(emp) || resolvePhoto(l.employee);
                  return (
                    <button key={l.id} onClick={() => setViewLoan(l)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 transition flex items-center gap-3 ${isActive ? "bg-primary/10 dark:bg-primary/15 border-l-4 border-l-primary" : "hover:bg-gray-50 dark:hover:bg-white/5 border-l-4 border-l-transparent"}`}>
                      {pic ? (
                        <img src={pic} alt={l.employeeName} onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-white/10" />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-semibold text-sm shrink-0 ${pic ? "hidden" : ""}`}>
                        {l.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{l.employeeName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{t("payroll.fields.id")}: {l.employeeId}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-gray-800 dark:text-gray-100">{l.loanAmount.toLocaleString()}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${l.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>{l.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right detail */}
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
              {viewLoan ? (() => {
                const l = viewLoan;
                const emp = employees.find(e => String(e.id) === String(l.employee_id));
                const heroPic = resolvePhoto(emp) || resolvePhoto(l.employee);
                const totalPaid = (l.loanAmount || 0) - (l.outstandingBalance || 0);
                const totalInstallments = l.monthlyInstallment > 0 ? Math.ceil(l.loanAmount / l.monthlyInstallment) : 0;
                const installmentsPaid = l.monthlyInstallment > 0 ? Math.round(totalPaid / l.monthlyInstallment) : 0;
                const installmentsLeft = Math.max(totalInstallments - installmentsPaid, 0);
                const paidPercent = l.loanAmount > 0 ? Math.round((totalPaid / l.loanAmount) * 100) : 0;
                const monthShift = (ym, n) => {
                  if (!ym || !/^\d{4}-\d{2}/.test(ym)) return "—";
                  const [y, m] = ym.split("-").map(Number);
                  const d = new Date(y, m - 1 + n, 1);
                  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                };
                const lastDeduction = installmentsPaid > 0 ? monthShift(l.startMonth, installmentsPaid - 1) : t("payroll.loans.notStarted");
                const nextDeduction = installmentsLeft > 0 ? monthShift(l.startMonth, installmentsPaid) : t("payroll.loans.fullyPaid");

                return (
                  <div className="h-full flex flex-col">
                    {/* Hero Header — neutral */}
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-7 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          {heroPic ? (
                            <img src={heroPic} alt={l.employeeName}
                              onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                              className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-200 dark:ring-white/10 shrink-0" />
                          ) : null}
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white items-center justify-center font-bold text-2xl ring-2 ring-gray-200 dark:ring-white/10 shrink-0 ${heroPic ? "hidden" : "flex"}`}>
                            {l.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{l.employeeName}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("payroll.fields.id")}: {l.employeeId} · {t("payroll.loans.loanWord")} #{l.id}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                              {emp?.department?.name && (
                                <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {emp.department.name}</span>
                              )}
                              {emp?.designation?.name && emp.designation.name !== "---" && (
                                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {emp.designation.name}</span>
                              )}
                              {emp?.branch?.branch_name && (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {emp.branch.branch_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button title={t("payroll.loans.downloadPdf")} onClick={async () => {
                            try {
                              const params = await buildQueryParams({});
                              const url = `${api.defaults.baseURL}/payroll-management/loan-advance-statement/${l.employee_id}?company_id=${params.company_id}`;
                              window.open(url, "_blank");
                            } catch (e) { alert(t("payroll.loans.failedOpenStatement")); }
                          }} className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-primary transition">
                            <Download className="h-4 w-4" />
                          </button>
                          <button title={t("payroll.common.edit")} onClick={() => {
                            setEditingLoanId(l.id);
                            setLoanForm({
                              employee_id: String(l.employee_id),
                              loan_amount: String(l.loanAmount),
                              monthly_installment: String(l.monthlyInstallment),
                              start_month: l.start_month || "",
                              end_month: l.end_month || "",
                              remarks: l.remarks || "",
                            });
                            if (emp) {
                              setSelBranch(emp.branch_id ? String(emp.branch_id) : "");
                              setSelDept(emp.department_id ? String(emp.department_id) : "");
                            }
                            setLoanDialog(true);
                          }} className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-primary transition">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button title={t("payroll.common.delete")} onClick={async () => {
                            if (!confirm(t("payroll.loans.confirmDeleteLoan", { name: l.employeeName }))) return;
                            try {
                              const params = await buildQueryParams({});
                              await api.delete(`/payroll-management/loans/${l.id}`, { params });
                              fetchLoans();
                            } catch (e) { alert(e?.response?.data?.message || t("payroll.common.deleteFailed")); }
                          }} className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-red-500 transition">
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50 dark:bg-gray-950/30">
                      {/* Stat cards with accent lines */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/10 flex items-center justify-center">
                              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("payroll.loans.totalLoan")}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{l.loanAmount.toLocaleString()}</p>
                        </div>
                        <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/10 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("payroll.loans.paidSoFar")}</p>
                          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{totalPaid.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t("payroll.loans.percentOfTotal", { percent: paidPercent })}</p>
                        </div>
                        <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-rose-600"></div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/15 to-rose-600/10 dark:from-rose-500/20 dark:to-rose-600/10 flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("payroll.loans.outstanding")}</p>
                          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">{l.outstandingBalance.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t("payroll.loans.installmentsLeftCount", { count: installmentsLeft })}</p>
                        </div>
                      </div>

                      {/* Recovery Progress — circular + bar chart */}
                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.loans.recoveryProgress")}</h4>
                            <p className="text-[10px] text-gray-400">{t("payroll.loans.trackingInstallment")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 mb-6">
                          <CircularProgress percent={paidPercent} size={140} stroke={12} gradientFrom="#6366f1" gradientTo="#3b82f6" labelTop={t("payroll.loans.recovered")} labelBottom={t("payroll.loans.ofTotal")} gradientId="loanProg" />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{t("payroll.loans.paid")}</div>
                                <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{installmentsPaid} <span className="text-xs text-gray-400 font-normal">/ {totalInstallments}</span></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{t("payroll.loans.remaining")}</div>
                                <div className="text-base font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{installmentsLeft} <span className="text-xs text-gray-400 font-normal">{t("payroll.loans.installmentsWord")}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Two-column: Schedule + Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                          <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.loans.paymentSchedule")}</h4>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500">{t("payroll.loans.monthlyInstallment")}</span>
                              <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{l.monthlyInstallment.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500">{t("payroll.loans.loanPeriod")}</span>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{l.startMonth} → {l.endMonth}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/10">
                              <span className="text-xs text-gray-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{t("payroll.loans.lastDeduction")}</span>
                              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{lastDeduction}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/10">
                              <span className="text-xs text-gray-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{t("payroll.loans.nextDeduction")}</span>
                              <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{nextDeduction}</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                          <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.loans.loanSummary")}</h4>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500">{t("payroll.common.status")}</span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${l.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${l.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`}></span>
                                {l.status?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500">{t("payroll.loans.totalInstallments")}</span>
                              <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{totalInstallments}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500 flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" />{t("payroll.loans.installmentsPaid")}</span>
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{installmentsPaid}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500 flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-amber-500" />{t("payroll.loans.installmentsLeft")}</span>
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{installmentsLeft}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Deduction Schedule timeline */}
                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.loans.deductionSchedule")}</h4>
                              <p className="text-[10px] text-gray-400">{t("payroll.loans.monthlyDeductionsCount", { count: totalInstallments })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{t("payroll.loans.paid")}</span>
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500"></span>{t("payroll.loans.next")}</span>
                            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>{t("payroll.loans.upcoming")}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                          {Array.from({ length: totalInstallments }, (_, i) => {
                            const monthLabel = (() => {
                              if (!/^\d{4}-\d{2}/.test(l.startMonth || "")) return t("payroll.loans.monthN", { n: i + 1 });
                              const [y, m] = l.startMonth.split("-").map(Number);
                              const d = new Date(y, m - 1 + i, 1);
                              return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                            })();
                            const isPaid = i < installmentsPaid;
                            const isNext = i === installmentsPaid && installmentsLeft > 0;
                            return (
                              <div key={i}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                                  isPaid
                                    ? "bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-500/20"
                                    : isNext
                                    ? "bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-500/20 ring-2 ring-amber-300 dark:ring-amber-500/30"
                                    : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-white/5"
                                }`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isPaid ? "bg-emerald-500 text-white"
                                  : isNext ? "bg-amber-500 text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                }`}>
                                  {isPaid ? <CheckCircle className="h-4 w-4" /> : i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{monthLabel}</div>
                                  <div className={`text-[10px] uppercase tracking-wider ${
                                    isPaid ? "text-emerald-600 dark:text-emerald-400"
                                    : isNext ? "text-amber-600 dark:text-amber-400"
                                    : "text-gray-400"
                                  }`}>
                                    {isPaid ? t("payroll.loans.deducted") : isNext ? t("payroll.loans.nextDeduction") : t("payroll.loans.upcoming")}
                                  </div>
                                </div>
                                <div className={`text-sm font-bold tabular-nums ${
                                  isPaid ? "text-emerald-700 dark:text-emerald-400"
                                  : isNext ? "text-amber-700 dark:text-amber-400"
                                  : "text-gray-500 dark:text-gray-400"
                                }`}>
                                  {l.monthlyInstallment.toLocaleString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
                          <span className="text-gray-500">{t("payroll.loans.totalDeductedSoFar")}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{(installmentsPaid * l.monthlyInstallment).toLocaleString()}</span>
                        </div>
                      </div>

                      {l.remarks && (
                        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-4 rounded-full bg-primary"></div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">{t("payroll.common.remarks")}</h4>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-3">{l.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm p-10 text-center">
                  {t("payroll.loans.selectLoan")}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Advances Tab */}
      {activeTab === "advances" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            {advMode === "detail" ? (
              <button onClick={() => { setAdvMode("table"); setViewAdv(null); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                ← {t("payroll.loans.backToList")}
              </button>
            ) : <span />}
            <button onClick={() => { setEditingAdvId(null); setAdvForm(emptyAdvForm); setAdvDialog(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
              <Plus className="h-3.5 w-3.5" /> {t("payroll.loans.addAdvance")}
            </button>
          </div>

          {/* TABLE MODE */}
          {advMode === "table" && (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-4">{t("payroll.common.employee")}</th><th className="px-3 py-4">{t("payroll.loans.advance")}</th><th className="px-3 py-4">{t("payroll.loans.monthlyRecovery")}</th><th className="px-3 py-4">{t("payroll.loans.outstanding")}</th><th className="px-3 py-4">{t("payroll.loans.issueDate")}</th><th className="px-3 py-4">{t("payroll.common.status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {displayedAdvances.map(a => {
                      const emp = employees.find(e => String(e.id) === String(a.employee_id));
                      const pic = resolvePhoto(emp) || resolvePhoto(a.employee);
                      return (
                        <tr key={a.id} onClick={() => { setViewAdv(a); setAdvMode("detail"); }}
                          className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {pic ? (
                                <img src={pic} alt={a.employeeName} onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0" />
                              ) : null}
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white items-center justify-center font-semibold text-sm shrink-0 ${pic ? "hidden" : "flex"}`}>
                                {a.employeeName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.employeeName}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{t("payroll.fields.id")}: {a.employeeId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm font-semibold tabular-nums">{a.advanceAmount.toLocaleString()}</td>
                          <td className="px-3 py-4 text-sm tabular-nums">{a.monthlyRecovery.toLocaleString()}</td>
                          <td className="px-3 py-4 text-sm font-semibold text-red-500 tabular-nums">{a.outstandingBalance.toLocaleString()}</td>
                          <td className="px-3 py-4 text-sm whitespace-nowrap">{a.issueDate}</td>
                          <td className="px-3 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${a.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>{a.status}</span></td>
                        </tr>
                      );
                    })}
                    {displayedAdvances.length === 0 && (
                      <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-400 text-sm">
                        {advances.length === 0 ? t("payroll.loans.noAdvances") : t("payroll.loans.noAdvancesMatch")}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DETAIL MODE */}
          {advMode === "detail" && (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[600px]">
            {/* Left list */}
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("payroll.loans.advancesCount", { count: displayedAdvances.length })}</h3>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[640px]">
                {displayedAdvances.length === 0 && (
                  <div className="px-4 py-10 text-center text-gray-400 text-sm">
                    {advances.length === 0 ? t("payroll.loans.noAdvancesYet") : t("payroll.loans.noMatches")}
                  </div>
                )}
                {displayedAdvances.map(a => {
                  const isActive = viewAdv?.id === a.id;
                  const emp = employees.find(e => String(e.id) === String(a.employee_id));
                  const pic = resolvePhoto(emp) || resolvePhoto(a.employee);
                  return (
                    <button key={a.id} onClick={() => setViewAdv(a)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 transition flex items-center gap-3 ${isActive ? "bg-amber-50 dark:bg-amber-900/15 border-l-4 border-l-amber-500" : "hover:bg-gray-50 dark:hover:bg-white/5 border-l-4 border-l-transparent"}`}>
                      {pic ? (
                        <img src={pic} alt={a.employeeName} onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-white/10" />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-semibold text-sm shrink-0 ${pic ? "hidden" : ""}`}>
                        {a.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{a.employeeName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{t("payroll.fields.id")}: {a.employeeId}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-gray-800 dark:text-gray-100">{a.advanceAmount.toLocaleString()}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>{a.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right detail */}
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
              {viewAdv ? (() => {
                const a = viewAdv;
                const emp = employees.find(e => String(e.id) === String(a.employee_id));
                const heroPic = resolvePhoto(emp) || resolvePhoto(a.employee);
                const totalPaid = (a.advanceAmount || 0) - (a.outstandingBalance || 0);
                const recoveriesTotal = a.monthlyRecovery > 0 ? Math.ceil(a.advanceAmount / a.monthlyRecovery) : 0;
                const recoveriesDone = a.monthlyRecovery > 0 ? Math.round(totalPaid / a.monthlyRecovery) : 0;
                const recoveriesLeft = Math.max(recoveriesTotal - recoveriesDone, 0);
                const paidPercent = a.advanceAmount > 0 ? Math.round((totalPaid / a.advanceAmount) * 100) : 0;
                const monthShift = (dateStr, n) => {
                  if (!dateStr) return "—";
                  const d = new Date(dateStr);
                  if (isNaN(d.getTime())) return "—";
                  d.setMonth(d.getMonth() + n);
                  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                };
                const lastDeduction = recoveriesDone > 0 ? monthShift(a.issueDate, recoveriesDone - 1) : t("payroll.loans.notStarted");
                const nextDeduction = recoveriesLeft > 0 ? monthShift(a.issueDate, recoveriesDone) : t("payroll.loans.fullyRecovered");

                return (
                  <div className="h-full flex flex-col">
                    {/* Hero Header — neutral */}
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-7 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          {heroPic ? (
                            <img src={heroPic} alt={a.employeeName}
                              onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                              className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-200 dark:ring-white/10 shrink-0" />
                          ) : null}
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white items-center justify-center font-bold text-2xl ring-2 ring-gray-200 dark:ring-white/10 shrink-0 ${heroPic ? "hidden" : "flex"}`}>
                            {a.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{a.employeeName}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("payroll.fields.id")}: {a.employeeId} · {t("payroll.loans.advanceWord")} #{a.id}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                              {emp?.department?.name && (
                                <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {emp.department.name}</span>
                              )}
                              {emp?.designation?.name && emp.designation.name !== "---" && (
                                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {emp.designation.name}</span>
                              )}
                              {emp?.branch?.branch_name && (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {emp.branch.branch_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button title={t("payroll.loans.downloadPdf")} onClick={async () => {
                            try {
                              const params = await buildQueryParams({});
                              const url = `${api.defaults.baseURL}/payroll-management/loan-advance-statement/${a.employee_id}?company_id=${params.company_id}`;
                              window.open(url, "_blank");
                            } catch (e) { alert(t("payroll.loans.failedOpenStatement")); }
                          }} className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-amber-500 transition">
                            <Download className="h-4 w-4" />
                          </button>
                          <button title={t("payroll.common.edit")} onClick={() => {
                            setEditingAdvId(a.id);
                            setAdvForm({
                              employee_id: String(a.employee_id),
                              advance_amount: String(a.advanceAmount),
                              monthly_recovery: String(a.monthlyRecovery),
                              issue_date: a.issue_date || "",
                              remarks: a.remarks || "",
                            });
                            if (emp) {
                              setSelBranch(emp.branch_id ? String(emp.branch_id) : "");
                              setSelDept(emp.department_id ? String(emp.department_id) : "");
                            }
                            setAdvDialog(true);
                          }} className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-primary transition">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button title={t("payroll.common.delete")} onClick={async () => {
                            if (!confirm(t("payroll.loans.confirmDeleteAdvance", { name: a.employeeName }))) return;
                            try {
                              const params = await buildQueryParams({});
                              await api.delete(`/payroll-management/advances/${a.id}`, { params });
                              fetchAdvances();
                            } catch (e) { alert(e?.response?.data?.message || t("payroll.common.deleteFailed")); }
                          }} className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-red-500 transition">
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50 dark:bg-gray-950/30">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/10 flex items-center justify-center">
                              <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("payroll.loans.totalAdvance")}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{a.advanceAmount.toLocaleString()}</p>
                        </div>
                        <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/10 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("payroll.loans.recovered")}</p>
                          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{totalPaid.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t("payroll.loans.percentOfTotal", { percent: paidPercent })}</p>
                        </div>
                        <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-rose-600"></div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/15 to-rose-600/10 dark:from-rose-500/20 dark:to-rose-600/10 flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("payroll.loans.outstanding")}</p>
                          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">{a.outstandingBalance.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t("payroll.loans.recoveriesLeftCount", { count: recoveriesLeft })}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.loans.recoveryProgress")}</h4>
                            <p className="text-[10px] text-gray-400">{t("payroll.loans.trackingAdvance")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <CircularProgress percent={paidPercent} size={140} stroke={12} gradientFrom="#f59e0b" gradientTo="#f97316" labelTop={t("payroll.loans.recovered")} labelBottom={t("payroll.loans.ofTotal")} gradientId="advProg" />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{t("payroll.loans.recovered")}</div>
                                <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{recoveriesDone} <span className="text-xs text-gray-400 font-normal">/ {recoveriesTotal}</span></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{t("payroll.loans.remaining")}</div>
                                <div className="text-base font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{recoveriesLeft} <span className="text-xs text-gray-400 font-normal">{t("payroll.loans.recoveriesWord")}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                          <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-amber-500" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.loans.recoverySchedule")}</h4>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500">{t("payroll.loans.monthlyRecovery")}</span>
                              <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{a.monthlyRecovery.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500">{t("payroll.loans.issueDate")}</span>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{a.issueDate}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/10">
                              <span className="text-xs text-gray-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{t("payroll.loans.lastDeduction")}</span>
                              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{lastDeduction}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/10">
                              <span className="text-xs text-gray-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{t("payroll.loans.nextDeduction")}</span>
                              <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{nextDeduction}</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                          <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.loans.advanceSummary")}</h4>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500">{t("payroll.common.status")}</span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${a.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${a.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`}></span>
                                {a.status?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500">{t("payroll.loans.totalRecoveries")}</span>
                              <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{recoveriesTotal}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500 flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" />{t("payroll.loans.recoveriesDone")}</span>
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{recoveriesDone}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                              <span className="text-xs text-gray-500 flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-amber-500" />{t("payroll.loans.recoveriesLeft")}</span>
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{recoveriesLeft}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recovery Schedule timeline */}
                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-amber-500" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("payroll.loans.recoverySchedule")}</h4>
                              <p className="text-[10px] text-gray-400">{t("payroll.loans.monthlyRecoveriesCount", { count: recoveriesTotal })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{t("payroll.loans.recovered")}</span>
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500"></span>{t("payroll.loans.next")}</span>
                            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>{t("payroll.loans.upcoming")}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                          {Array.from({ length: recoveriesTotal }, (_, i) => {
                            const monthLabel = (() => {
                              if (!a.issueDate) return t("payroll.loans.monthN", { n: i + 1 });
                              const d = new Date(a.issueDate);
                              if (isNaN(d.getTime())) return t("payroll.loans.monthN", { n: i + 1 });
                              d.setMonth(d.getMonth() + i);
                              return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                            })();
                            const isPaid = i < recoveriesDone;
                            const isNext = i === recoveriesDone && recoveriesLeft > 0;
                            return (
                              <div key={i}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                                  isPaid
                                    ? "bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-500/20"
                                    : isNext
                                    ? "bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-500/20 ring-2 ring-amber-300 dark:ring-amber-500/30"
                                    : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-white/5"
                                }`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isPaid ? "bg-emerald-500 text-white"
                                  : isNext ? "bg-amber-500 text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                }`}>
                                  {isPaid ? <CheckCircle className="h-4 w-4" /> : i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{monthLabel}</div>
                                  <div className={`text-[10px] uppercase tracking-wider ${
                                    isPaid ? "text-emerald-600 dark:text-emerald-400"
                                    : isNext ? "text-amber-600 dark:text-amber-400"
                                    : "text-gray-400"
                                  }`}>
                                    {isPaid ? t("payroll.loans.recovered") : isNext ? t("payroll.loans.nextRecovery") : t("payroll.loans.upcoming")}
                                  </div>
                                </div>
                                <div className={`text-sm font-bold tabular-nums ${
                                  isPaid ? "text-emerald-700 dark:text-emerald-400"
                                  : isNext ? "text-amber-700 dark:text-amber-400"
                                  : "text-gray-500 dark:text-gray-400"
                                }`}>
                                  {a.monthlyRecovery.toLocaleString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
                          <span className="text-gray-500">{t("payroll.loans.totalRecoveredSoFar")}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{(recoveriesDone * a.monthlyRecovery).toLocaleString()}</span>
                        </div>
                      </div>

                      {a.remarks && (
                        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-4 rounded-full bg-amber-500"></div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">{t("payroll.common.remarks")}</h4>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-3">{a.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm p-10 text-center">
                  {t("payroll.loans.selectAdvance")}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Add Loan Dialog */}
      {loanDialog && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLoanDialog(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{editingLoanId ? t("payroll.loans.editLoan") : t("payroll.loans.newLoan")}</h3>
              <button onClick={() => { setLoanDialog(false); setEditingLoanId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <BranchDeptEmpFilter formValue={loanForm.employee_id} onEmpChange={v => setLoanForm({ ...loanForm, employee_id: v })} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.loans.loanAmount")}</label>
                  <input type="number" placeholder="0" value={loanForm.loan_amount} onChange={e => setLoanForm({ ...loanForm, loan_amount: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.loans.monthlyInstallment")}</label>
                  <input type="number" placeholder="0" value={loanForm.monthly_installment} onChange={e => setLoanForm({ ...loanForm, monthly_installment: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.loans.startMonth")}</label>
                  <MonthPicker
                    value={loanForm.start_month}
                    onChange={v => setLoanForm({ ...loanForm, start_month: v })}
                    placeholder={t("payroll.loans.selectStartMonth")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.loans.endMonth")}</label>
                  <MonthPicker
                    value={loanForm.end_month}
                    onChange={v => setLoanForm({ ...loanForm, end_month: v })}
                    placeholder={t("payroll.loans.selectEndMonth")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.common.remarks")}</label>
                <textarea placeholder={t("payroll.adjustments.reasonPlaceholder")} rows={2} value={loanForm.remarks} onChange={e => setLoanForm({ ...loanForm, remarks: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 resize-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setLoanDialog(false); setEditingLoanId(null); }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">{t("payroll.common.cancel")}</button>
              <button disabled={saving} onClick={async () => {
                if (!loanForm.employee_id || !loanForm.loan_amount || !loanForm.monthly_installment) { alert(t("payroll.loans.loanValidation")); return; }
                setSaving(true);
                try {
                  const params = await buildQueryParams({});
                  if (editingLoanId) {
                    await api.put(`/payroll-management/loans/${editingLoanId}`, { ...params, ...loanForm });
                  } else {
                    await api.post("/payroll-management/loans", { ...params, ...loanForm, status: "active" });
                  }
                  setLoanDialog(false);
                  setLoanForm(emptyLoanForm);
                  setEditingLoanId(null);
                  fetchLoans();
                } catch (e) { alert(e?.response?.data?.message || t("payroll.common.saveFailed")); }
                finally { setSaving(false); }
              }}
                className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
                {saving ? t("payroll.common.saving") : editingLoanId ? t("payroll.loans.updateLoan") : t("payroll.loans.saveLoan")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Advance Dialog */}
      {advDialog && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAdvDialog(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{editingAdvId ? t("payroll.loans.editAdvance") : t("payroll.loans.newAdvance")}</h3>
              <button onClick={() => { setAdvDialog(false); setEditingAdvId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <BranchDeptEmpFilter formValue={advForm.employee_id} onEmpChange={v => setAdvForm({ ...advForm, employee_id: v })} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.loans.advanceAmount")}</label>
                  <input type="number" placeholder="0" value={advForm.advance_amount} onChange={e => setAdvForm({ ...advForm, advance_amount: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("payroll.loans.monthlyRecovery")}</label>
                  <input type="number" placeholder="0" value={advForm.monthly_recovery} onChange={e => setAdvForm({ ...advForm, monthly_recovery: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.loans.issueDate")}</label>
                <input type="date" value={advForm.issue_date} onChange={e => setAdvForm({ ...advForm, issue_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("payroll.common.remarks")}</label>
                <textarea placeholder={t("payroll.adjustments.reasonPlaceholder")} rows={2} value={advForm.remarks} onChange={e => setAdvForm({ ...advForm, remarks: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 resize-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setAdvDialog(false); setEditingAdvId(null); }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">{t("payroll.common.cancel")}</button>
              <button disabled={saving} onClick={async () => {
                if (!advForm.employee_id || !advForm.advance_amount || !advForm.monthly_recovery) { alert(t("payroll.loans.advanceValidation")); return; }
                setSaving(true);
                try {
                  const params = await buildQueryParams({});
                  if (editingAdvId) {
                    await api.put(`/payroll-management/advances/${editingAdvId}`, { ...params, ...advForm });
                  } else {
                    await api.post("/payroll-management/advances", { ...params, ...advForm, status: "active" });
                  }
                  setAdvDialog(false);
                  setAdvForm(emptyAdvForm);
                  setEditingAdvId(null);
                  fetchAdvances();
                } catch (e) { alert(e?.response?.data?.message || t("payroll.common.saveFailed")); }
                finally { setSaving(false); }
              }}
                className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
                {saving ? t("payroll.common.saving") : editingAdvId ? t("payroll.loans.updateAdvance") : t("payroll.loans.saveAdvance")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
