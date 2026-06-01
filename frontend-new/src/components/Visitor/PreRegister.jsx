"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Plus, Trash2, X, CalendarCheck, Clock, CheckCircle, AlertCircle, QrCode, Printer, Check, XCircle, ScanLine } from "lucide-react";
import QRCode from "qrcode";
import { useTranslation } from "react-i18next";

const statusIcons = { confirmed: CheckCircle, pending: Clock };
const statusColors = {
  confirmed: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  rejected: "bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400",
  approved: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
};


export default function PreRegister() {
  const { t } = useTranslation();
  const statusLabel = (s) => {
    const key = String(s || "").toLowerCase().replace(/-/g, "");
    const known = { confirmed: 1, pending: 1, rejected: 1, approved: 1 };
    return known[key] ? t(`visitor.common.statuses.${key}`) : s;
  };
  const typeLabel = (ty) => {
    const key = String(ty || "").toLowerCase();
    const known = { business: 1, contractor: 1, delivery: 1, interview: 1, vip: 1 };
    return known[key] ? t(`visitor.dash.types.${key}`) : ty;
  };
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrVisitor, setQrVisitor] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [preRegs, setPreRegs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ visitor_name: "", company_name: "", email: "", phone: "", expected_date: "", expected_time: "", host_name: "", purpose: "", visitor_type: "Business", notes: "" });

  const fetchPreRegs = async () => {
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/visitor-management/pre-registrations", { params: { ...params, per_page: 100 } });
      setPreRegs((data?.data || []).map(r => ({
        id: r.id, visitorName: r.visitor_name, company: r.company_name || "---",
        host: r.host_name || r.host_employee?.first_name || "---",
        purpose: r.purpose || "---", expectedDate: r.expected_date,
        expectedTime: r.expected_time || "---", type: r.visitor_type || "Business",
        status: r.status, notes: r.notes || "", qr_code: r.qr_code,
        photo: r.photo || null,
        source: r.visitor_type === "Host QR" ? "host_qr" : "api",
      })));
    } catch (e) {}
  };

  useEffect(() => {
    fetchPreRegs();
    const interval = setInterval(fetchPreRegs, 10000);
    return () => clearInterval(interval);
  }, []);

  const updatePreRegStatus = async (id, status) => {
    try {
      const params = await buildQueryParams({});
      await api.put(`/visitor-management/pre-registrations/${id}`, { ...params, status });
      setPreRegs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      alert(t("visitor.preregister.statusUpdateFailed"));
    }
  };

  const showQr = async (v) => {
    setQrVisitor(v);
    const qrData = JSON.stringify({ id: v.id, name: v.visitorName, company: v.company, date: v.expectedDate, time: v.expectedTime });
    const url = await QRCode.toDataURL(qrData, { width: 200, margin: 2, color: { dark: "#000", light: "#fff" } });
    setQrDataUrl(url);
  };

  const printBadge = (v) => {
    const win = window.open("", "_blank");
    const qrCanvas = document.getElementById("qr-badge-img");
    const qrSrc = qrCanvas ? qrCanvas.src : "";
    win.document.write(`<html><head><title>${t("visitor.preregister.badgeTitle")}</title>
      <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
      .badge{width:320px;border:2px solid #333;border-radius:12px;padding:24px;text-align:center;background:#fff}
      .badge h2{margin:0 0 4px;font-size:18px}.badge .company{color:#666;font-size:12px;margin-bottom:16px}
      .badge .field{display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #eee}
      .badge .field span:first-child{color:#999}.badge .qr{margin:16px auto 8px}
      .badge .type{display:inline-block;background:#7c3aed;color:#fff;font-size:10px;font-weight:bold;padding:3px 10px;border-radius:20px;margin-top:8px}
      @media print{body{background:#fff}}</style></head><body>
      <div class="badge">
        <h2>${v.visitorName}</h2>
        <div class="company">${v.company}</div>
        ${qrSrc ? `<img class="qr" src="${qrSrc}" width="150" />` : ""}
        <div class="field"><span>${t("visitor.common.host")}</span><span>${v.host}</span></div>
        <div class="field"><span>${t("visitor.preregister.purpose")}</span><span>${v.purpose}</span></div>
        <div class="field"><span>${t("visitor.common.date")}</span><span>${v.expectedDate}</span></div>
        <div class="field"><span>${t("visitor.common.time")}</span><span>${v.expectedTime}</span></div>
        <div class="type">${typeLabel(v.type)}</div>
      </div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const filtered = preRegs.filter(v =>
    !search || [v.visitorName, v.company, v.host].some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  const upcoming = filtered.filter(v => v.status === "confirmed").length;
  const pending = filtered.filter(v => v.status === "pending").length;

  const handleSavePreReg = async () => {
    if (!form.visitor_name || !form.expected_date) { alert(t("visitor.preregister.nameDateRequired")); return; }
    setSaving(true);
    try {
      const params = await buildQueryParams({});
      await api.post("/visitor-management/pre-registrations", { ...params, ...form });
      setDialogOpen(false);
      setForm({ visitor_name: "", company_name: "", email: "", phone: "", expected_date: "", expected_time: "", host_name: "", purpose: "", visitor_type: "Business", notes: "" });
      fetchPreRegs();
    } catch (e) { alert(t("visitor.preregister.saveFailed")); }
    finally { setSaving(false); }
  };

  const handleDeletePreReg = async (id) => {
    if (!confirm(t("visitor.preregister.confirmDelete"))) return;
    try {
      const params = await buildQueryParams({});
      await api.delete(`/visitor-management/pre-registrations/${id}`, { params });
      fetchPreRegs();
    } catch (e) { alert(t("visitor.preregister.deleteFailed")); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t("visitor.preregister.title")}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("visitor.preregister.subtitle")}</p>
        </div>
        <button onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
          <Plus className="h-3.5 w-3.5" /> {t("visitor.preregister.preRegisterVisitor")}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><CalendarCheck className="w-4 h-4 text-blue-500" /><span className="text-[10px] text-gray-500">{t("visitor.preregister.totalScheduled")}</span></div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{filtered.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-[10px] text-gray-500">{t("visitor.preregister.confirmed")}</span></div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{upcoming}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-amber-500" /><span className="text-[10px] text-gray-500">{t("visitor.preregister.pending")}</span></div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pending}</div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input placeholder={t("visitor.common.searchEllipsis")} value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">{t("visitor.common.visitor")}</th><th className="px-3 py-3">{t("visitor.common.host")}</th><th className="px-3 py-3">{t("visitor.preregister.purpose")}</th>
                <th className="px-3 py-3">{t("visitor.common.date")}</th><th className="px-3 py-3">{t("visitor.common.time")}</th><th className="px-3 py-3">{t("visitor.common.type")}</th>
                <th className="px-3 py-3">{t("visitor.common.status")}</th><th className="px-3 py-3">{t("visitor.common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs text-gray-600 dark:text-gray-300">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {v.photo ? (
                        <img src={v.photo} alt={v.visitorName} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-semibold text-gray-500">
                          {v.visitorName?.split(" ").map(n => n[0]).slice(0, 2).join("") || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-800 dark:text-gray-100">{v.visitorName}</div>
                        <div className="text-[10px] text-gray-400">{v.company}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{v.host}</td>
                  <td className="px-3 py-3">{v.purpose}</td>
                  <td className="px-3 py-3 font-mono text-[11px]">{v.expectedDate}</td>
                  <td className="px-3 py-3">{v.expectedTime}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      v.source === "host_qr"
                        ? "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                        : "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                    }`}>
                      {v.source === "host_qr" ? <span className="inline-flex items-center gap-1"><ScanLine className="w-3 h-3" /> {typeLabel(v.type)}</span> : typeLabel(v.type)}
                    </span>
                  </td>
                  <td className="px-3 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusColors[v.status] || ""}`}>{statusLabel(v.status)}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      {v.source === "host_qr" && v.status === "pending" && (
                        <>
                          <button title={t("visitor.preregister.approve")} onClick={() => updatePreRegStatus(v.id, "confirmed")} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-gray-400 hover:text-emerald-600 transition"><Check className="h-3.5 w-3.5" /></button>
                          <button title={t("visitor.preregister.reject")} onClick={() => updatePreRegStatus(v.id, "rejected")} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/10 text-gray-400 hover:text-rose-600 transition"><XCircle className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                      {v.source !== "host_qr" && (
                        <>
                          <button title={t("visitor.preregister.qrCode")} onClick={() => showQr(v)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-primary transition"><QrCode className="h-3.5 w-3.5" /></button>
                          <button title={t("visitor.preregister.printBadge")} onClick={() => { showQr(v); setTimeout(() => printBadge(v), 500); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-emerald-500 transition"><Printer className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                      <button
                        title={t("visitor.common.delete")}
                        onClick={() => handleDeletePreReg(v.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-500 transition"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400 text-xs">{t("visitor.preregister.noPreRegs")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("visitor.preregister.preRegisterVisitor")}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              {[[t("visitor.preregister.visitorName"), "text", "visitor_name"], [t("visitor.common.company"), "text", "company_name"], [t("visitor.common.email"), "email", "email"], [t("visitor.common.phone"), "tel", "phone"]].map(([label, type, key]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{label}</label>
                  <input type={type} placeholder={label} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("visitor.preregister.expectedDate")}</label>
                  <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("visitor.preregister.expectedTime")}</label>
                  <input type="time" value={form.expected_time} onChange={e => setForm({ ...form, expected_time: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("visitor.common.host")}</label>
                  <input type="text" placeholder={t("visitor.preregister.hostNamePlaceholder")} value={form.host_name} onChange={e => setForm({ ...form, host_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("visitor.preregister.purpose")}</label>
                  <input type="text" placeholder={t("visitor.preregister.purposePlaceholder")} value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("visitor.common.type")}</label>
                <select value={form.visitor_type} onChange={e => setForm({ ...form, visitor_type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <option value="Business">{t("visitor.dash.types.business")}</option><option value="Contractor">{t("visitor.dash.types.contractor")}</option>
                  <option value="Delivery">{t("visitor.dash.types.delivery")}</option><option value="Interview">{t("visitor.dash.types.interview")}</option><option value="VIP">{t("visitor.dash.types.vip")}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("visitor.preregister.notes")}</label>
                <textarea placeholder={t("visitor.preregister.notesPlaceholder")} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 resize-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">{t("visitor.common.cancel")}</button>
              <button disabled={saving} onClick={handleSavePreReg} className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
                {saving ? t("visitor.common.saving") : t("visitor.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Dialog */}
      {qrVisitor && qrDataUrl && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setQrVisitor(null); setQrDataUrl(null); }}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t("visitor.preregister.qrTitle")}</h3>
              <button onClick={() => { setQrVisitor(null); setQrDataUrl(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="bg-white p-4 rounded-lg inline-block mx-auto mb-4">
              <img id="qr-badge-img" src={qrDataUrl} alt={t("visitor.preregister.qrCode")} className="w-48 h-48" />
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{qrVisitor.visitorName}</div>
            <div className="text-xs text-gray-500 mb-1">{qrVisitor.company}</div>
            <div className="text-[10px] text-gray-400">{qrVisitor.expectedDate} {t("visitor.preregister.at")} {qrVisitor.expectedTime}</div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => printBadge(qrVisitor)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition">
                <Printer className="w-3.5 h-3.5" /> {t("visitor.preregister.printBadge")}
              </button>
              <button onClick={() => { const a = document.createElement("a"); a.href = qrDataUrl; a.download = `qr-${qrVisitor.visitorName}.png`; a.click(); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <QrCode className="w-3.5 h-3.5" /> {t("visitor.preregister.downloadQr")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
