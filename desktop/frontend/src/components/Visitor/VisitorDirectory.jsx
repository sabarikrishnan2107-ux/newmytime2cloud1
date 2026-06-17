"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Plus, Eye, Edit, Trash2, X, Mail, Phone, Building, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

const typeColors = {
  Business: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  Contractor: "bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400",
  Delivery: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  Interview: "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
  VIP: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
};

// Renders the visitor photo, falling back to initials if there's no image
// (or the stored file is empty / fails to load — e.g. registered without a photo).
function VisitorAvatar({ src, name, className = "w-10 h-10" }) {
  const [err, setErr] = useState(false);
  const initials = (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`${className} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0`}>
      {src && !err
        ? <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        : initials}
    </div>
  );
}

export default function VisitorDirectory() {
  const { t } = useTranslation();
  const statusLabel = (s) => {
    const key = String(s || "").toLowerCase().replace(/-/g, "");
    const known = { checkedin: 1, checkedout: 1, active: 1 };
    return known[key] ? t(`visitor.common.statuses.${key}`) : s;
  };
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [addDialog, setAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [vForm, setVForm] = useState({ first_name: "", last_name: "", phone_number: "", email: "", visitor_company_name: "", id_type: "", id_number: "" });

  const handleDelete = async (visitor) => {
    if (!window.confirm(t("visitor.directory.confirmDelete", { name: visitor.name }))) return;
    setDeletingId(visitor.id);
    try {
      await api.delete(`/visitor/${visitor.id}`);
      setSelectedVisitor((s) => (s && s.id === visitor.id ? null : s));
      setVisitors((prev) => prev.filter((v) => v.id !== visitor.id));
    } catch (e) {
      alert(e?.response?.data?.message || t("visitor.directory.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => { fetchVisitors(); }, []);

  const fetchVisitors = async () => {
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/visitor-management/directory", { params: { ...params, per_page: 100 } });
      setVisitors((data?.data || []).map(v => ({
        id: v.id,
        name: `${v.first_name} ${v.last_name || ""}`.trim(),
        company: v.visitor_company_name || "---",
        email: v.email || "---",
        phone: v.phone_number || "---",
        idType: v.id_type || "---",
        idNumber: v.id_number || "---",
        type: "Visitor",
        totalVisits: 0,
        lastVisit: v.date || v.created_at?.split("T")[0] || "---",
        status: v.status_id === 6 ? "checked-in" : v.status_id === 7 ? "checked-out" : "active",
        photo: v.logo,
        zone: v.zone?.name || "---",
      })));
    } catch (e) {}
  };

  const handleAddVisitor = async () => {
    if (!vForm.first_name) { alert(t("visitor.directory.firstNameRequired")); return; }
    setSaving(true);
    try {
      const params = await buildQueryParams({});
      const today = new Date().toISOString().split("T")[0];
      await api.post("/visitor-register", {
        ...params,
        first_name: vForm.first_name,
        last_name: vForm.last_name || ".",
        phone_number: vForm.phone_number || "0000000000",
        email: vForm.email || "",
        gender: "Male",
        visitor_company_name: vForm.visitor_company_name || "---",
        // id_type is a bigint column with no lookup table — sending text 500s.
        id_type: null,
        id_number: vForm.id_number || "",
        note: vForm.id_type || "",
        purpose_id: 1,
        host_company_id: null,
        date: today,
        visit_from: today,
        visit_to: today,
        time_in: "00:00",
        time_out: "23:59",
        status_id: 1,
      });
      setAddDialog(false);
      setVForm({ first_name: "", last_name: "", phone_number: "", email: "", visitor_company_name: "", id_type: "", id_number: "" });
      fetchVisitors();
    } catch (e) { alert(e?.response?.data?.message || t("visitor.directory.addFailed")); }
    finally { setSaving(false); }
  };

  const filtered = visitors.filter(v => {
    const matchSearch = !search || [v.name, v.company, v.email].some(f => f.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || v.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t("visitor.directory.title")}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("visitor.directory.subtitle")}</p>
        </div>
        <button onClick={() => setAddDialog(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
          <Plus className="h-3.5 w-3.5" /> {t("visitor.directory.addVisitor")}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder={t("visitor.directory.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <option value="all">{t("visitor.dash.allTypes")}</option>
          <option value="Business">{t("visitor.dash.types.business")}</option><option value="Contractor">{t("visitor.dash.types.contractor")}</option>
          <option value="Delivery">{t("visitor.dash.types.delivery")}</option><option value="Interview">{t("visitor.dash.types.interview")}</option><option value="VIP">{t("visitor.dash.types.vip")}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(v => (
          <div key={v.id} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4 hover:shadow-md transition cursor-pointer" onClick={() => setSelectedVisitor(v)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <VisitorAvatar src={v.photo} name={v.name} />
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{v.name}</div>
                  <div className="text-[10px] text-gray-400">{v.company}</div>
                </div>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${typeColors[v.type] || "bg-gray-100 text-gray-500"}`}>{t("visitor.common.visitor")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-500"><Mail className="w-3 h-3" />{v.email}</div>
              <div className="flex items-center gap-1.5 text-gray-500"><Phone className="w-3 h-3" />{v.phone}</div>
              <div className="flex items-center gap-1.5 text-gray-500"><Shield className="w-3 h-3" />{v.idType}: {v.idNumber}</div>
              <div className="flex items-center gap-1.5 text-gray-500"><Building className="w-3 h-3" />{t("visitor.directory.visitsCount", { count: v.totalVisits })}</div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <span className="text-[10px] text-gray-400">{t("visitor.directory.lastVisit")} {v.lastVisit}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${v.status === "active" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}>{statusLabel(v.status)}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedVisitor(v); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                <Eye className="h-3.5 w-3.5" /> {t("visitor.common.view")}
              </button>
              <button
                disabled={deletingId === v.id}
                onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 dark:border-red-500/30 px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" /> {deletingId === v.id ? t("visitor.directory.deleting") : t("visitor.common.delete")}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-8 text-gray-400 text-xs">{t("visitor.directory.noVisitors")}</div>}
      </div>

      {selectedVisitor && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedVisitor(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <VisitorAvatar src={selectedVisitor.photo} name={selectedVisitor.name} className="w-9 h-9" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{selectedVisitor.name}</h3>
              </div>
              <button onClick={() => setSelectedVisitor(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {selectedVisitor.photo && (
                <VisitorAvatar src={selectedVisitor.photo} name={selectedVisitor.name} className="w-24 h-24 mx-auto" />
              )}
              {[[t("visitor.common.company"), selectedVisitor.company], [t("visitor.common.email"), selectedVisitor.email], [t("visitor.common.phone"), selectedVisitor.phone],
                [t("visitor.hub.idType"), selectedVisitor.idType], [t("visitor.directory.idNumber"), selectedVisitor.idNumber], [t("visitor.common.type"), t("visitor.common.visitor")],
                [t("visitor.directory.totalVisits"), selectedVisitor.totalVisits], [t("visitor.directory.lastVisitLabel"), selectedVisitor.lastVisit], [t("visitor.common.status"), statusLabel(selectedVisitor.status)]].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span><span className="text-gray-800 dark:text-gray-200 font-medium">{value}</span>
                </div>
              ))}
              <button
                disabled={deletingId === selectedVisitor.id}
                onClick={() => handleDelete(selectedVisitor)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 dark:border-red-500/30 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" /> {deletingId === selectedVisitor.id ? t("visitor.directory.deleting") : t("visitor.directory.deleteVisitor")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Visitor Dialog */}
      {addDialog && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAddDialog(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("visitor.directory.addVisitor")}</h3>
              <button onClick={() => setAddDialog(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[[t("visitor.directory.firstName"), "first_name", t("visitor.directory.enterFirstName")], [t("visitor.directory.lastName"), "last_name", t("visitor.directory.enterLastName")]].map(([label, key, ph]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">{label}</label>
                    <input type="text" placeholder={ph} value={vForm[key]} onChange={e => setVForm({ ...vForm, [key]: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("visitor.common.phone")}</label>
                  <input type="tel" placeholder={t("visitor.directory.phonePlaceholder")} value={vForm.phone_number} onChange={e => setVForm({ ...vForm, phone_number: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("visitor.common.email")}</label>
                  <input type="email" placeholder={t("visitor.directory.emailPlaceholder")} value={vForm.email} onChange={e => setVForm({ ...vForm, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">{t("visitor.common.company")}</label>
                <input type="text" placeholder={t("visitor.directory.companyPlaceholder")} value={vForm.visitor_company_name} onChange={e => setVForm({ ...vForm, visitor_company_name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("visitor.hub.idType")}</label>
                  <select value={vForm.id_type} onChange={e => setVForm({ ...vForm, id_type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="">{t("visitor.directory.select")}</option><option value="Passport">{t("visitor.hub.idTypes.passport")}</option><option value="National ID">{t("visitor.hub.idTypes.nationalId")}</option>
                    <option value="Emirates ID">{t("visitor.hub.idTypes.emiratesId")}</option><option value="Driver License">{t("visitor.hub.idTypes.driverLicense")}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{t("visitor.directory.idNumber")}</label>
                  <input type="text" placeholder={t("visitor.directory.idNumberPlaceholder")} value={vForm.id_number} onChange={e => setVForm({ ...vForm, id_number: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setAddDialog(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">{t("visitor.common.cancel")}</button>
              <button disabled={saving} onClick={handleAddVisitor}
                className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-50">
                {saving ? t("visitor.common.saving") : t("visitor.directory.addVisitor")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
