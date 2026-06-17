import React, { useState, useRef, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { useTranslation } from "react-i18next";

const VisitorHub = () => {
  const { t } = useTranslation();
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [stats, setStats] = useState({ total_today: 0, checked_in: 0, pre_registered: 0, pending_approvals: 0 });
  const [visitors, setVisitors] = useState([]);
  const [form, setForm] = useState({ first_name: "", phone_number: "", id_number: "", id_type: "" });
  const [submitting, setSubmitting] = useState(false);
  const [eidReading, setEidReading] = useState(false);
  const [eidScriptReady, setEidScriptReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Toolkit) { setEidScriptReady(true); return; }
    const existing = document.querySelector('script[data-eida-toolkit]');
    if (existing) {
      existing.addEventListener("load", () => setEidScriptReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = "/eidatoolkit.js";
    s.async = true;
    s.dataset.eidaToolkit = "true";
    s.onload = () => setEidScriptReady(true);
    s.onerror = () => console.error("Failed to load eidatoolkit.js");
    document.body.appendChild(s);
  }, []);

  const readEmiratesIdPublicData = () => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.Toolkit) {
        reject(new Error("EID Toolkit not loaded"));
        return;
      }
      let ToolkitOB = null;
      let readerClass = null;
      let settled = false;
      const done = (fn, arg) => {
        if (settled) return;
        settled = true;
        try { if (readerClass && readerClass.disconnect) readerClass.disconnect(() => {}); } catch (_) {}
        fn(arg);
      };
      const fail = (msg) => done(reject, new Error(msg));

      const options = {
        debugEnabled: false,
        agent_tls_enabled: false,
        agent_host_name: "toolkitagent.emiratesid.ae",
        jnlp_address: "/IDCardToolkitService.jnlp",
        toolkitConfig:
          'vg_connection_timeout = 60 \n' +
          'log_level = "INFO" \n' +
          'log_performance_time = true \n' +
          'read_publicdata_offline = false \n',
      };

      const onOpen = (_resp, error) => {
        if (error) return fail("Agent open failed: " + (error.message || error));
        ToolkitOB.getReaderWithEmiratesId(onListReaders);
      };
      const onClose = () => {};
      const onError = (err) => fail("Agent error: " + (err && err.message ? err.message : err));

      const onListReaders = (response, error) => {
        if (error) return fail("No reader: " + (error.message || error.description || error));
        readerClass = response;
        if (!readerClass) return fail("No reader found. Plug in the card reader.");
        readerClass.connect(onCardConnected);
      };
      const onCardConnected = (_resp, error) => {
        if (error) return fail("Card not connected: " + (error.message || error.code || error));
        readerClass.getInterfaceType(onInterface);
      };
      const onInterface = (response, error) => {
        if (error) return fail("Interface check failed: " + (error.message || error));
        const isNfc = response === 2;
        const requestId = btoa(String(Math.random()).slice(2) + Date.now());
        readerClass.readPublicData(
          requestId, true, true, true, true, !isNfc,
          (resp, err) => {
            if (err) return fail("Read failed: " + (err.message || err));
            resp.isNfc = isNfc;
            done(resolve, resp);
          }
        );
      };

      try { ToolkitOB = new window.Toolkit(onOpen, onClose, onError, options); }
      catch (e) { fail("Could not start toolkit: " + e); }
    });
  };

  const photoMimeFromBase64 = (b64) => {
    if (!b64) return "image/jpeg";
    if (b64.indexOf("/9j/") === 0) return "image/jpeg";
    if (b64.indexOf("Qk") === 0) return "image/bmp";
    if (b64.indexOf("iVBOR") === 0) return "image/png";
    return "image/jpeg";
  };

  const handleReadEid = async () => {
    setEidReading(true);
    try {
      const resp = await readEmiratesIdPublicData();
      const nm = resp.nonModifiablePublicData || {};
      const home = resp.homeAddress || {};
      setForm((f) => ({
        ...f,
        first_name: nm.fullNameEnglish || f.first_name,
        phone_number: home.mobilePhoneNumber || f.phone_number,
        id_number: resp.iDNumber || f.id_number,
        id_type: "Emirates ID",
      }));
      if (resp.cardHolderPhoto) {
        const mime = photoMimeFromBase64(resp.cardHolderPhoto);
        setCapturedPhoto(`data:${mime};base64,${resp.cardHolderPhoto}`);
      }
    } catch (e) {
      alert(t("visitor.hub.eidReadFailed") + " " + (e.message || e));
    } finally {
      setEidReading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOpen(true);
    } catch (e) { alert(t("visitor.hub.cameraDenied")); }
  };

  const capturePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 240;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0, 320, 240);
    setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.8));
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCameraOpen(false);
  };

  const retakePhoto = () => { setCapturedPhoto(null); startCamera(); };

  const fetchData = async () => {
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/visitor-management/dashboard", { params });
      setStats(data);
    } catch (e) {}
    try {
      const params = await buildQueryParams({});
      const { data } = await api.get("/visitor", { params: { ...params, per_page: 10 } });
      const items = (data?.data || []).map(v => ({
        id: v.id,
        name: `${v.first_name} ${v.last_name || ""}`.trim(),
        company: v.visitor_company_name || "---",
        host: "---",
        time: v.time_in || "---",
        status_id: v.status_id,
        status: v.status_id === 6 ? t("visitor.common.statuses.onsite") : v.status_id === 7 ? t("visitor.common.statuses.checkedout") : v.status_id === 1 ? t("visitor.common.statuses.pending") : "---",
        statusClass: v.status_id === 6 ? "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
          : v.status_id === 7 ? "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700"
          : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
        initials: `${v.first_name?.[0] || ""}${v.last_name?.[0] || ""}`.toUpperCase(),
        photo: v.logo,
      }));
      setVisitors(items);
    } catch (e) {}
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckIn = async () => {
    if (!form.first_name.trim()) { alert(t("visitor.hub.nameRequired")); return; }
    setSubmitting(true);
    try {
      const params = await buildQueryParams({});
      const nameParts = form.first_name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || ".";
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toTimeString().slice(0, 5);
      const payload = {
        ...params,
        first_name: firstName,
        last_name: lastName,
        phone_number: form.phone_number || "0000000000",
        email: "",
        gender: "Male",
        visitor_company_name: "Walk-in",
        // register() reads $data['host_company_id'] directly — send null so the
        // key exists (avoids "Undefined array key"); no host mapping for walk-ins.
        host_company_id: null,
        // `visitors.id_type` is a bigint column with no lookup table, so a text
        // label throws a 22P02 cast error — keep it null, label goes in `note`.
        id_type: null,
        id_number: form.id_number || "",
        purpose_id: 1,
        note: form.id_type || "",
        date: today,
        visit_from: today,
        visit_to: today,
        time_in: now,
        time_out: "23:59",
        status_id: 6,
        logo: capturedPhoto || null,
      };
      const { data } = await api.post("/visitor-register", payload);
      if (data && data.status === false) {
        alert(t("visitor.hub.checkinFailed") + " " + (data.message || "Unknown error"));
        return;
      }
      alert(t("visitor.hub.checkedIn"));
      setForm({ first_name: "", phone_number: "", id_number: "", id_type: "" });
      setCapturedPhoto(null);
      fetchData();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || t("visitor.hub.checkinFailed");
      alert(t("visitor.hub.checkinFailed") + " " + msg);
    } finally { setSubmitting(false); }
  };

  const handleCheckOut = async (id) => {
    try {
      const params = await buildQueryParams({});
      await api.post(`/visitor-status-update/${id}`, { ...params, status_id: 7, checked_out_datetime: new Date().toISOString() });
      fetchData();
    } catch (e) { alert(t("visitor.hub.checkoutFailed")); }
  };

  return (
    <div className="flex-1 space-y-6 pt-5 px-2">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("visitor.hub.kpi.visitorsToday"), value: stats.total_today, icon: "groups", color: "emerald" },
          { label: t("visitor.hub.kpi.currentlyOnsite"), value: stats.checked_in, icon: "domain_verification", color: "indigo" },
          { label: t("visitor.hub.kpi.expected"), value: stats.pre_registered, icon: "schedule", color: "purple" },
          { label: t("visitor.hub.kpi.pendingApproval"), value: stats.pending_approvals, icon: "pending_actions", color: "amber" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-slate-900/50 rounded-xl p-5 flex flex-col gap-1 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">{kpi.label}</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{kpi.value}</h3>
              </div>
              <div className={`p-2 bg-${kpi.color}-500/10 rounded-lg text-${kpi.color}-600 dark:text-${kpi.color}-400 border border-${kpi.color}-500/20`}>
                <span className="material-symbols-outlined">{kpi.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Check-in Form */}
          <div className="rounded-xl p-6 relative overflow-hidden border-t-2 border-t-indigo-500 bg-white dark:bg-slate-900 shadow-xl">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="p-1 rounded bg-indigo-500/10"><span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-sm">how_to_reg</span></span>
                {t("visitor.hub.quickCheckin")}
              </h3>
            </div>

            <div className="flex flex-col md:flex-row gap-6 relative z-10">
              {/* Photo Capture */}
              <div className="w-full md:w-44 shrink-0">
                <div className="h-32 md:h-full min-h-[180px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2 text-slate-400 overflow-hidden relative">
                  {capturedPhoto ? (
                    <>
                      <img src={capturedPhoto} alt={t("visitor.common.visitor")} className="w-full h-full object-cover rounded-lg" />
                      <button onClick={retakePhoto} className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-bold px-3 py-1 rounded-full hover:bg-black/80 transition">{t("visitor.hub.retake")}</button>
                    </>
                  ) : cameraOpen ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-lg" />
                      <button onClick={capturePhoto} className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full hover:bg-indigo-700 transition flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">photo_camera</span> {t("visitor.hub.capture")}
                      </button>
                    </>
                  ) : (
                    <button onClick={startCamera} className="flex flex-col items-center gap-2 hover:text-indigo-500 transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-3xl">photo_camera</span>
                      <span className="text-[10px] font-semibold uppercase">{t("visitor.hub.takePhoto")}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                {[
                  { label: t("visitor.hub.visitorName"), icon: "person", placeholder: t("visitor.hub.enterFullName"), key: "first_name" },
                  { label: t("visitor.hub.phoneNumber"), icon: "call", placeholder: "(555) 000-0000", key: "phone_number" },
                  { label: t("visitor.hub.idNumber"), icon: "pin", placeholder: t("visitor.hub.enterIdNumber"), key: "id_number" },
                ].map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{field.label}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-slate-400 group-focus-within:text-indigo-500 transition-colors text-[20px]">{field.icon}</span>
                      </div>
                      <input value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                        className="block w-full pl-10 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm h-11 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
                        placeholder={field.placeholder} type="text" />
                    </div>
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{t("visitor.hub.idType")}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-slate-400 text-[20px]">badge</span>
                    </div>
                    <select value={form.id_type} onChange={e => setForm({ ...form, id_type: e.target.value })}
                      className="block w-full pl-10 pr-10 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm h-11 text-slate-900 dark:text-white transition-all appearance-none">
                      <option value="">{t("visitor.hub.selectIdType")}</option>
                      <option value="National ID">{t("visitor.hub.idTypes.nationalId")}</option>
                      <option value="Passport">{t("visitor.hub.idTypes.passport")}</option>
                      <option value="Emirates ID">{t("visitor.hub.idTypes.emiratesId")}</option>
                      <option value="Driver License">{t("visitor.hub.idTypes.driverLicense")}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 relative z-10">
              <button disabled={eidReading || !eidScriptReady} onClick={handleReadEid}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 uppercase tracking-wide text-xs shadow-md transition-all disabled:opacity-50">
                <span className="material-symbols-outlined text-lg">badge</span>
                {eidReading ? t("visitor.hub.reading") : t("visitor.hub.readEid")}
              </button>
              <button disabled={submitting} onClick={handleCheckIn}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 uppercase tracking-wide text-xs shadow-md transition-all disabled:opacity-50">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                {submitting ? t("visitor.hub.checkingIn") : t("visitor.hub.checkinVisitor")}
              </button>
            </div>
          </div>

          {/* Live Visitor Log */}
          <div className="rounded-xl overflow-hidden flex flex-col h-auto min-h-[300px] bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">table_rows</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("visitor.hub.liveLog")}</h3>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100/80 dark:bg-slate-900/50 text-xs uppercase text-slate-500 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">{t("visitor.hub.visitorName")}</th>
                    <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">{t("visitor.common.company")}</th>
                    <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">{t("visitor.common.time")}</th>
                    <th className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">{t("visitor.common.status")}</th>
                    <th className="px-6 py-4 text-right border-b border-slate-200 dark:border-slate-800">{t("visitor.common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visitors.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center font-bold text-sm">
                            {v.initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{v.name}</div>
                            <div className="text-xs text-slate-500">{v.company}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">{v.company}</td>
                      <td className="px-6 py-4 text-xs">{v.time}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${v.statusClass}`}>
                          {v.status_id === 6 && <span className="size-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500 animate-pulse"></span>}
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          {v.status_id === 6 && (
                            <button onClick={() => handleCheckOut(v.id)} className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-all" title={t("visitor.hub.checkOut")}>
                              <span className="material-symbols-outlined text-[20px]">logout</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visitors.length === 0 && (
                    <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 text-xs">{t("visitor.hub.noVisitorsYet")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-6">
          <div className="rounded-xl p-5 h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">notifications_active</span>
                {t("visitor.hub.activityFeed")}
              </h3>
            </div>
            <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-6">
              {visitors.filter(v => v.status_id === 6).slice(0, 3).map((v, i) => (
                <div key={v.id} className="relative group">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900"></span>
                  <div className="flex flex-col gap-1 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{t("visitor.hub.checkin")}</p>
                      <span className="text-[10px] text-slate-400">{v.time}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-slate-900 dark:text-white">{v.name}</span> {t("visitor.hub.checkedInFrom", { company: v.company })}
                    </p>
                  </div>
                </div>
              ))}
              {visitors.length === 0 && (
                <p className="text-xs text-slate-400 pl-2">{t("visitor.hub.noRecentActivity")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="h-4"></div>
    </div>
  );
};

export default VisitorHub;
