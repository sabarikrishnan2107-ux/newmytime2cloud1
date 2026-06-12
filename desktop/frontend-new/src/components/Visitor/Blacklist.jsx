"use client";

import { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { Search, Plus, ShieldOff, Trash2, X, AlertTriangle, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Blacklist() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [blacklist, setBlacklist] = useState([]);
  const [saving, setSaving] = useState(false);
  const [blForm, setBlForm] = useState({ name: "", company_name: "", id_type: "Passport", id_number: "", reason: "" });

  const fetchBlacklist = async () => {
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/visitor-management/blacklist", { params: { ...params, per_page: 100 } });
      setBlacklist((data?.data || []).map(b => ({
        id: b.id, name: b.name, company: b.company_name || "---",
        reason: b.reason, addedBy: b.added_by || "Admin",
        addedDate: b.created_at?.split("T")[0] || "---",
        idNumber: b.id_number || "---", idType: b.id_type || "---",
        incidents: b.incidents || 1, photo: b.photo,
      })));
    } catch (e) {}
  };

  useEffect(() => { fetchBlacklist(); }, []);

  const handleAddBlacklist = async () => {
    if (!blForm.name || !blForm.reason) { alert(t("visitor.blacklist.nameReasonRequired")); return; }
    setSaving(true);
    try {
      const params = await buildQueryParams({});
      await api.post("/visitor-management/blacklist", { ...params, ...blForm, added_by: "Admin" });
      setDialogOpen(false);
      setBlForm({ name: "", company_name: "", id_type: "Passport", id_number: "", reason: "" });
      fetchBlacklist();
    } catch (e) { alert(t("visitor.blacklist.failed")); }
    finally { setSaving(false); }
  };

  const handleRemove = async (id) => {
    if (!confirm(t("visitor.blacklist.confirmRemove"))) return;
    try {
      const params = await buildQueryParams({});
      await api.put(`/visitor-management/blacklist/${id}/remove`, params);
      fetchBlacklist();
    } catch (e) { alert(t("visitor.blacklist.failed")); }
  };

  const filtered = blacklist.filter(b =>
    !search || [b.name, b.company, b.reason].some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t("visitor.blacklist.title")}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("visitor.blacklist.subtitle")}</p>
        </div>
        <button onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 transition shadow-sm">
          <Plus className="h-3.5 w-3.5" /> {t("visitor.blacklist.addToBlacklist")}
        </button>
      </div>

      {/* Warning Banner */}
      <div className="flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-900/10 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-xs text-red-700 dark:text-red-400"><strong>{t("visitor.blacklist.peopleCount", { count: blacklist.length })}</strong> {t("visitor.blacklist.bannerRest")}</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input placeholder={t("visitor.blacklist.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(b => (
          <div key={b.id} className="rounded-xl border border-red-200 dark:border-red-500/20 bg-white dark:bg-gray-900/50 p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <ShieldOff className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{b.name}</div>
                  <div className="text-[10px] text-gray-400">{b.company} &middot; {b.idType}: {b.idNumber}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">{b.incidents} {b.incidents > 1 ? t("visitor.blacklist.incidents") : t("visitor.blacklist.incident")}</span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <span className="font-semibold text-red-600 dark:text-red-400">{t("visitor.blacklist.reason")}</span> {b.reason}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-gray-400">{t("visitor.blacklist.addedByOn", { by: b.addedBy, date: b.addedDate })}</div>
              <div className="flex gap-1">
                <button onClick={() => setSelectedPerson(b)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-primary transition"><Eye className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleRemove(b.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-gray-400 hover:text-emerald-500 transition" title={t("visitor.blacklist.removeTitle")}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-8 text-gray-400 text-xs">{t("visitor.blacklist.noBlacklisted")}</div>}
      </div>

      {/* Add to Blacklist Dialog */}
      {dialogOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("visitor.blacklist.addToBlacklist")}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500">{t("visitor.blacklist.fullName")}</label>
                  <input type="text" placeholder={t("visitor.hub.enterFullName")} value={blForm.name} onChange={e => setBlForm({ ...blForm, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500">{t("visitor.common.company")}</label>
                  <input type="text" placeholder={t("visitor.blacklist.companyNamePlaceholder")} value={blForm.company_name} onChange={e => setBlForm({ ...blForm, company_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500">{t("visitor.hub.idType")}</label>
                  <select value={blForm.id_type} onChange={e => setBlForm({ ...blForm, id_type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="Passport">{t("visitor.hub.idTypes.passport")}</option><option value="National ID">{t("visitor.hub.idTypes.nationalId")}</option><option value="Emirates ID">{t("visitor.hub.idTypes.emiratesId")}</option><option value="Driver License">{t("visitor.hub.idTypes.driverLicense")}</option>
                  </select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500">{t("visitor.directory.idNumber")}</label>
                  <input type="text" placeholder={t("visitor.directory.idNumberPlaceholder")} value={blForm.id_number} onChange={e => setBlForm({ ...blForm, id_number: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500">{t("visitor.blacklist.reasonLabel")}</label>
                <textarea placeholder={t("visitor.blacklist.reasonPlaceholder")} rows={3} value={blForm.reason} onChange={e => setBlForm({ ...blForm, reason: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 resize-none"></textarea></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">{t("visitor.common.cancel")}</button>
              <button disabled={saving} onClick={handleAddBlacklist} className="px-4 py-2 rounded-lg bg-red-600 text-xs font-medium text-white hover:bg-red-700 transition shadow-sm disabled:opacity-50">
                {saving ? t("visitor.blacklist.adding") : t("visitor.blacklist.addToBlacklist")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedPerson && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPerson(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{selectedPerson.name}</h3>
              <button onClick={() => setSelectedPerson(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[[t("visitor.common.company"), selectedPerson.company], [t("visitor.hub.idType"), selectedPerson.idType], [t("visitor.directory.idNumber"), selectedPerson.idNumber],
                [t("visitor.blacklist.reasonCol"), selectedPerson.reason], [t("visitor.blacklist.addedBy"), selectedPerson.addedBy], [t("visitor.reports.columns.dateAdded"), selectedPerson.addedDate],
                [t("visitor.blacklist.incidentsCol"), selectedPerson.incidents]].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span><span className="text-gray-800 dark:text-gray-200 font-medium">{value}</span>
                </div>
              ))}
              <button onClick={() => { handleRemove(selectedPerson.id); setSelectedPerson(null); }}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition">
                {t("visitor.blacklist.removeFromBlacklist")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
