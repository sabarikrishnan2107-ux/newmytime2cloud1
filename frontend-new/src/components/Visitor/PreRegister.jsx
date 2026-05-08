"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Plus, Trash2, X, CalendarCheck, Clock, CheckCircle, AlertCircle, QrCode, Printer, Check, XCircle, ScanLine } from "lucide-react";
import QRCode from "qrcode";

const statusIcons = { confirmed: CheckCircle, pending: Clock };
const statusColors = {
  confirmed: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  rejected: "bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400",
  approved: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
};


export default function PreRegister() {
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
      alert("Status update failed");
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
    win.document.write(`<html><head><title>Visitor Badge</title>
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
        <div class="field"><span>Host</span><span>${v.host}</span></div>
        <div class="field"><span>Purpose</span><span>${v.purpose}</span></div>
        <div class="field"><span>Date</span><span>${v.expectedDate}</span></div>
        <div class="field"><span>Time</span><span>${v.expectedTime}</span></div>
        <div class="type">${v.type}</div>
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
    if (!form.visitor_name || !form.expected_date) { alert("Visitor Name and Expected Date are required"); return; }
    setSaving(true);
    try {
      const params = await buildQueryParams({});
      await api.post("/visitor-management/pre-registrations", { ...params, ...form });
      setDialogOpen(false);
      setForm({ visitor_name: "", company_name: "", email: "", phone: "", expected_date: "", expected_time: "", host_name: "", purpose: "", visitor_type: "Business", notes: "" });
      fetchPreRegs();
    } catch (e) { alert("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDeletePreReg = async (id) => {
    if (!confirm("Delete this pre-registration?")) return;
    try {
      const params = await buildQueryParams({});
      await api.delete(`/visitor-management/pre-registrations/${id}`, { params });
      fetchPreRegs();
    } catch (e) { alert("Delete failed"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Pre-Registration</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Schedule and manage upcoming visitor appointments</p>
        </div>
        <button onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
          <Plus className="h-3.5 w-3.5" /> Pre-Register Visitor
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><CalendarCheck className="w-4 h-4 text-blue-500" /><span className="text-[10px] text-gray-500">Total Scheduled</span></div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{filtered.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-[10px] text-gray-500">Confirmed</span></div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{upcoming}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-amber-500" /><span className="text-[10px] text-gray-500">Pending</span></div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pending}</div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Visitor</th><th className="px-3 py-3">Host</th><th className="px-3 py-3">Purpose</th>
                <th className="px-3 py-3">Date</th><th className="px-3 py-3">Time</th><th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th>
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
                      {v.source === "host_qr" ? <span className="inline-flex items-center gap-1"><ScanLine className="w-3 h-3" /> {v.type}</span> : v.type}
                    </span>
                  </td>
                  <td className="px-3 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusColors[v.status] || ""}`}>{v.status}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      {v.source === "host_qr" && v.status === "pending" && (
                        <>
                          <button title="Approve" onClick={() => updatePreRegStatus(v.id, "confirmed")} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-gray-400 hover:text-emerald-600 transition"><Check className="h-3.5 w-3.5" /></button>
                          <button title="Reject" onClick={() => updatePreRegStatus(v.id, "rejected")} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/10 text-gray-400 hover:text-rose-600 transition"><XCircle className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                      {v.source !== "host_qr" && (
                        <>
                          <button title="QR Code" onClick={() => showQr(v)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-primary transition"><QrCode className="h-3.5 w-3.5" /></button>
                          <button title="Print Badge" onClick={() => { showQr(v); setTimeout(() => printBadge(v), 500); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-emerald-500 transition"><Printer className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                      <button
                        title="Delete"
                        onClick={() => handleDeletePreReg(v.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-500 transition"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400 text-xs">No pre-registrations found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Pre-Register Visitor</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              {[["Visitor Name", "text", "visitor_name"], ["Company", "text", "company_name"], ["Email", "email", "email"], ["Phone", "tel", "phone"]].map(([label, type, key]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{label}</label>
                  <input type={type} placeholder={label} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Expected Date</label>
                  <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Expected Time</label>
                  <input type="time" value={form.expected_time} onChange={e => setForm({ ...form, expected_time: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Host</label>
                  <input type="text" placeholder="Host name" value={form.host_name} onChange={e => setForm({ ...form, host_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Purpose</label>
                  <input type="text" placeholder="Meeting purpose" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Type</label>
                <select value={form.visitor_type} onChange={e => setForm({ ...form, visitor_type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <option value="Business">Business</option><option value="Contractor">Contractor</option>
                  <option value="Delivery">Delivery</option><option value="Interview">Interview</option><option value="VIP">VIP</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Notes</label>
                <textarea placeholder="Special requirements..." rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 resize-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button disabled={saving} onClick={handleSavePreReg} className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Dialog */}
      {qrVisitor && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setQrVisitor(null); setQrDataUrl(null); }}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Visitor QR Code</h3>
              <button onClick={() => { setQrVisitor(null); setQrDataUrl(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="bg-white p-4 rounded-lg inline-block mx-auto mb-4">
              <img id="qr-badge-img" src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{qrVisitor.visitorName}</div>
            <div className="text-xs text-gray-500 mb-1">{qrVisitor.company}</div>
            <div className="text-[10px] text-gray-400">{qrVisitor.expectedDate} at {qrVisitor.expectedTime}</div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => printBadge(qrVisitor)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition">
                <Printer className="w-3.5 h-3.5" /> Print Badge
              </button>
              <button onClick={() => { const a = document.createElement("a"); a.href = qrDataUrl; a.download = `qr-${qrVisitor.visitorName}.png`; a.click(); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <QrCode className="w-3.5 h-3.5" /> Download QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
