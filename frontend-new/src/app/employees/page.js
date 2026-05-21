"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw, Download, Copy, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getBranches, getDepartmentsByBranchIds, getEmployees, removeEmployee } from '@/lib/api';
import { getUser } from '@/config';
import { EmployeeExtras } from '@/components/Employees/Extras';
import EnrolledDevicesModal from '@/components/Employees/EnrolledDevicesModal';

import Columns from "./columns";
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/lib/Pagination';
import { parseApiError } from '@/lib/utils';
import Input from '@/components/Theme/Input';
import IconButton from '@/components/Theme/IconButton';
import MultiDropDown from '@/components/ui/MultiDropDown';

export default function EmployeesPage() {

    const { t } = useTranslation();
    const router = useRouter();

    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [selectedBranchIds, setSelectedBranchIds] = useState([]);
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(() => {
        if (typeof window === 'undefined') return 10;
        const rows = Math.floor((window.innerHeight - 220) / 70);
        return Math.max(10, Math.min(100, rows));
    });
    const [total, setTotalEmployees] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {

        const fetchBranches = async () => {
            try {
                setBranches(await getBranches());
            } catch (error) {
                setError(parseApiError(error));
            }
        };

        fetchBranches();
    }, []);


    useEffect(() => {
        const fetchDepartments = async (selectedBranchIds) => {
            try {
                setDepartments(await getDepartmentsByBranchIds(selectedBranchIds));
            } catch (error) {
                setError(parseApiError(error));
            }
        };
        fetchDepartments(selectedBranchIds);
    }, [selectedBranchIds]);

    const fetchEmployees = useCallback(async (page, perPage) => {
        setIsLoading(true);
        setError(null);

        try {
            const params = {
                page: page,
                per_page: perPage,
                sortDesc: 'false',
                branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : [],
                department_ids: selectedDepartmentIds.length > 0 ? selectedDepartmentIds : [],
                search: searchTerm || null, // Only include search if it's not empty
            };
            const result = await getEmployees(params);

            // Check if result has expected structure before setting state
            if (result && Array.isArray(result.data)) {
                setEmployees(result.data);
                setCurrentPage(result.current_page || 1);
                setTotalEmployees(result.total || 0);
                setIsLoading(false);
                return; // Success, exit
            } else {
                // If the API returned a 2xx status but the data structure is wrong
                throw new Error('Invalid data structure received from API.');
            }

        } catch (error) {
            setError(parseApiError(error));
            setIsLoading(false);
        }
    }, [perPage, selectedBranchIds, selectedDepartmentIds, searchTerm]);


    useEffect(() => {
        fetchEmployees(currentPage, perPage);
    }, [currentPage, perPage, fetchEmployees]); // Re-fetch when page or perPage changes

    const handleRefresh = () => {
        fetchEmployees(currentPage, perPage);
    }

    const deleteEmployee = async (id) => {
        if (confirm(t('employees.list.confirmDelete'))) {
            try {
                await removeEmployee(id);
                fetchEmployees(currentPage, perPage);
            } catch (error) {
                console.error("Error deleting employee:", error);
            }
        }
    }

    const editEmployee = async (id) => {
        router.push(`/employees/edit?id=${id}`)
    }

    const [hostQrEmployee, setHostQrEmployee] = useState(null);
    const [devicesEmployee, setDevicesEmployee] = useState(null);
    const [hostQrDataUrl, setHostQrDataUrl] = useState(null);
    const [hostQrUrl, setHostQrUrl] = useState("");

    const showHostQr = async (employee) => {
        setHostQrEmployee(employee);
        const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim() || `Employee ${employee.employee_id || employee.id}`;
        const payload = {
            id: employee.id,
            eid: employee.employee_id || "",
            name: fullName,
            company: employee?.branch?.company?.name || employee?.company?.name || "",
            email: employee?.user?.email || "",
            phone: employee?.phone_number || "",
            branch: employee?.branch?.branch_name || "",
            department: employee?.department?.name || "",
            flat: employee?.flat_number || employee?.flat_no || "",
            cid: employee?.company_id || employee?.branch?.company_id || employee?.branch?.company?.id || null,
            bid: employee?.branch_id || employee?.branch?.id || null,
        };
        const encoded = typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(JSON.stringify(payload)))) : "";
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/visitor/host-checkin/?h=${encoded}`;
        setHostQrUrl(url);
        const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } });
        setHostQrDataUrl(dataUrl);
    };

    const closeHostQr = () => {
        setHostQrEmployee(null);
        setHostQrDataUrl(null);
        setHostQrUrl("");
    };

    const downloadHostQr = () => {
        if (!hostQrDataUrl) return;
        const a = document.createElement("a");
        a.href = hostQrDataUrl;
        a.download = `host-qr-${hostQrEmployee?.employee_id || hostQrEmployee?.id || "employee"}.png`;
        a.click();
    };

    const copyHostQrUrl = async () => {
        if (!hostQrUrl) return;
        try { await navigator.clipboard.writeText(hostQrUrl); } catch {}
    };

    const printEmployeeCard = async (employee) => {
        if (!employee) return;
        const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const fmtDate = (raw) => {
            if (!raw) return "—";
            const d = new Date(raw);
            if (isNaN(d.getTime())) return String(raw).slice(0, 10);
            return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        };

        const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim() || `Employee ${employee.employee_id || employee.id}`;
        const empCode = String(employee.employee_id || employee.id || "—");
        const designation = employee?.designation?.name || employee?.position || "—";
        const dept = employee?.department?.name || "";
        // Resolve the employee's company. Try the eager-loaded branch.company first;
        // fall back to the logged-in user's company (always available); finally a generic label.
        let company = employee?.branch?.company?.name || employee?.company?.name || "";
        if (!company) {
            try {
                const u = getUser();
                company = u?.company_name || u?.company?.name || "";
            } catch {}
        }
        if (!company) company = "Company";
        const photo = employee?.profile_picture && employee.profile_picture !== "undefined" ? employee.profile_picture : "";
        const dojRaw = employee?.joining_date || employee?.date_of_joining || "";
        const doj = fmtDate(dojRaw);
        const branchName = employee?.branch?.branch_name || employee?.branch?.name || "—";
        const initial = fullName.charAt(0).toUpperCase();

        // Pre-generate the QR as a data URL so the popup doesn't need to load qrcode lib
        let qrDataUrl = "";
        try {
            qrDataUrl = await QRCode.toDataURL(empCode, { width: 200, margin: 0, color: { dark: "#0f172a", light: "#ffffff" } });
        } catch {}

        const photoHtml = photo
            ? `<img src="${esc(photo)}" alt="" onerror="this.outerHTML='<span class=\\'fallback\\'>${esc(initial)}</span>'">`
            : `<span class="fallback">${esc(initial)}</span>`;

        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Access Card · ${esc(fullName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
  body { background: #f1f5f9; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 18px; }

  /* Standard CR80 ID-card size: 53.98mm × 85.6mm */
  .card {
    width: 53.98mm; height: 85.6mm; padding: 4mm 5mm;
    background: #fff; color: #000; position: relative;
    overflow: hidden; box-sizing: border-box;
    box-shadow: 0 8px 30px rgba(15,23,42,0.18);
    border-radius: 6px;
  }
  .photo-wrap {
    width: 34mm; height: 34mm;
    border-radius: 50%;
    overflow: hidden; background: #f8fafc;
    border: 0.35mm solid #000;
    margin: 2mm auto 0;
    display: flex; align-items: center; justify-content: center;
    box-sizing: border-box;
  }
  .photo-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 50%; }
  .photo-wrap .fallback { font-size: 60px; font-weight: 700; color: #94a3b8; }

  .name-block { text-align: center; margin-top: 2mm; }
  .name-block .name { font-size: 12px; font-weight: 700; line-height: 1.2; }
  .name-block .designation { font-size: 15px; font-weight: 700; line-height: 1.2; margin-top: 1mm; }

  .footer-row {
    display: flex; justify-content: space-between; align-items: flex-end; gap: 4mm;
    margin-top: 2.5mm;
  }
  .footer-row .meta { font-size: 12.5px; font-weight: 700; line-height: 1.4; min-width: 0; flex: 1; }
  .footer-row .meta div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .footer-row .meta div + div { margin-top: 0.5mm; }
  .footer-row .qr { background: #fff; }
  .footer-row .qr img { display: block; width: 50px; height: 50px; }

  .brand {
    position: absolute; left: 0; right: 0; bottom: 2mm;
    text-align: center;
    padding: 0 3mm;
  }
  .brand .logo {
    color: #0e7490; font-family: 'Montserrat', 'Inter', system-ui, sans-serif;
    line-height: 1; letter-spacing: 0.02em;
    font-weight: 800;
    font-size: 24px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* Toolbar shown only on screen, hidden in print */
  .toolbar { display: flex; gap: 8px; }
  .toolbar button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; }
  .toolbar .print { background: #0e7490; color: #fff; }
  .toolbar .close { background: #e2e8f0; color: #0f172a; }

  @media print {
    body { background: #fff; padding: 0; gap: 0; }
    .card { box-shadow: none; border-radius: 0; }
    .toolbar { display: none !important; }
    @page { size: 53.98mm 85.6mm; margin: 0; }
  }
</style></head>
<body>
  <div class="toolbar">
    <button class="print" onclick="window.print()">Print</button>
    <button class="close" onclick="window.close()">Close</button>
  </div>
  <div class="card">
    <div class="photo-wrap">${photoHtml}</div>
    <div class="name-block">
      <div class="name">${esc(fullName)}</div>
      <div class="designation">${esc(designation)}</div>
    </div>
    <div class="footer-row">
      <div class="meta">
        <div>EmpID: ${esc(empCode)}</div>
        <div>DOJ: ${esc(doj)}</div>
        <div>Branch: ${esc(branchName)}</div>
      </div>
      <div class="qr">
        ${qrDataUrl ? `<img src="${esc(qrDataUrl)}" alt="QR">` : ""}
      </div>
    </div>
    <div class="brand">
      <div class="logo">${esc(company.toUpperCase())}</div>
    </div>
  </div>
  <script>
    // Shrink an element's font-size until its content fits inside its container.
    function fitText(el, container, startPx, minPx) {
      if (!el || !container) return;
      var size = startPx;
      el.style.fontSize = size + 'px';
      // measure the widest child (handles multi-line meta block)
      function widest() {
        var max = 0;
        var kids = el.children.length ? el.children : [el];
        for (var i = 0; i < kids.length; i++) {
          if (kids[i].scrollWidth > max) max = kids[i].scrollWidth;
        }
        return max;
      }
      var avail = container.clientWidth;
      while (widest() > avail && size > minPx) {
        size -= 0.5;
        el.style.fontSize = size + 'px';
      }
    }
    function fitAll() {
      var brand = document.querySelector('.brand');
      var logo  = document.querySelector('.brand .logo');
      fitText(logo, brand, 24, 10);

      var meta = document.querySelector('.footer-row .meta');
      if (meta) {
        // container width = meta's own slot (flex: 1) — measure parent minus QR
        fitText(meta, meta, 12.5, 8);
      }
    }
    // Wait for web fonts so measurements are accurate, then fit and print.
    function ready() {
      fitAll();
      setTimeout(function () { window.print(); }, 250);
    }
    window.addEventListener('load', function () {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(ready);
      } else {
        ready();
      }
    });
  </script>
</body></html>`;

        const w = window.open("", "_blank", "width=520,height=820");
        if (!w) {
            notify("Pop-ups blocked", "Allow pop-ups for this site to print the ID card.", "error");
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
    };

    return (
        <div className='p-3 sm:p-4 pb-4 overflow-y-auto max-h-[calc(100vh-100px)]'>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-6">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center shrink-0">
                    {t('employees.list.pageTitle')}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="relative w-full sm:w-auto">
                        <MultiDropDown
                            placeholder={t('employees.list.selectBranchPlaceholder')}
                            items={branches}
                            value={selectedBranchIds}
                            onChange={setSelectedBranchIds}
                            badgesCount={1}
                            width='w-full sm:w-[200px]'
                        />
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <MultiDropDown
                            placeholder={t('employees.list.selectDepartmentPlaceholder')}
                            items={departments}
                            value={selectedDepartmentIds}
                            onChange={setSelectedDepartmentIds}
                            badgesCount={1}
                            width='w-full sm:w-[200px]'
                        />
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <Input
                            placeholder={t('employees.list.searchPlaceholder')}
                            icon="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <IconButton
                        icon={RefreshCw}
                        onClick={handleRefresh}
                        isLoading={isLoading}
                        title={t('employees.list.refreshTitle')}
                    />

                    <EmployeeExtras data={employees} onUploadSuccess={fetchEmployees} />

                    {/* New Employee Button */}
                    <Link href="/employees/create">
                        <button className="bg-primary text-white px-4 py-1 rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap">
                            <Plus className="w-4 h-4" />
                            <span>{t('employees.list.newButton')}</span>
                        </button>
                    </Link>
                </div>
            </div>

            <DataTable
                columns={Columns(t, deleteEmployee, editEmployee, showHostQr, (emp) => printEmployeeCard(emp), setDevicesEmployee)}
                data={employees}
                isLoading={isLoading}
                error={error}
                onRowClick={(item) => router.push(`/employees/short?id=${item.id}`)}
                pagination={
                    <Pagination
                        page={currentPage}
                        perPage={perPage}
                        total={total}
                        onPageChange={setCurrentPage}
                        onPerPageChange={(n) => {
                            setPerPage(n);
                            setCurrentPage(1);
                        }}
                        pageSizeOptions={[10, 25, 50, 100]}
                    />
                }
            />

            <EnrolledDevicesModal
                open={!!devicesEmployee}
                employee={devicesEmployee}
                onClose={() => setDevicesEmployee(null)}
            />

            {hostQrEmployee && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 px-4"
                    onClick={closeHostQr}
                >
                    <div
                        className="w-[440px] max-w-full rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 pt-4 pb-2">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">Host QR Code</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Visitors scan this to register with this host</p>
                            </div>
                            <button
                                onClick={closeHostQr}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-5 pb-5">
                            <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl py-4">
                                {hostQrDataUrl ? (
                                    <img src={hostQrDataUrl} alt="Host QR" className="w-[260px] h-[260px]" />
                                ) : (
                                    <div className="w-[260px] h-[260px] flex items-center justify-center text-sm text-slate-400">Generating…</div>
                                )}
                            </div>
                            <div className="mt-3 text-center">
                                <div className="text-sm font-semibold text-slate-800 dark:text-white">
                                    {[hostQrEmployee.first_name, hostQrEmployee.last_name].filter(Boolean).join(" ") || `Employee ${hostQrEmployee.employee_id || hostQrEmployee.id}`}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {hostQrEmployee?.branch?.branch_name || "—"} · {hostQrEmployee?.department?.name || "—"}
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={downloadHostQr}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white px-3 py-2 text-sm font-semibold hover:opacity-95"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </button>
                                <button
                                    onClick={copyHostQrUrl}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <Copy className="w-4 h-4" /> Copy Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
