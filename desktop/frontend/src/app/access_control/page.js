"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LogIn, LogOut, Users, Server, Activity, Siren, User, UserPlus, Lock } from "lucide-react";
import { KpiCard } from "@/components/AccessControl/KpiCard";
import { FilterBar } from "@/components/AccessControl/FilterBar";
import { LogTable } from "@/components/AccessControl/LogTable";
import { DeviceHealthPanel } from "@/components/AccessControl/DeviceHealthPanel";
import EmergencyPinDialog from "@/components/AccessControl/EmergencyPinDialog";
import EmployeeLogsDialog from "@/components/AccessControl/EmployeeLogsDialog";
import PinEntryModal from "@/components/Device/UnlockDoor";
import {
  getAccessControlReport,
  getVisitorLogs,
  getBranches,
  getDeviceList,
  getDevices,
  getScheduledEmployeeList,
  checkDeviceHealth,
  openDoor,
  closeDoor,
} from "@/lib/api";
import { getUser } from "@/config";
import { can } from "@/lib/permissions-check";
import { parseApiError, notify } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Resolve IN/OUT for a single log from the device's reported function /
// log_type / device id. Returns null when no signal is available.
function explicitIsOut(l) {
  const f = (l?.device?.function || "").toLowerCase();
  const t = (l?.log_type || l?.LogType || "").toLowerCase();
  if (f === "out" || t === "out") return true;
  if (f === "in" || t === "in") return false;
  const dev = String(l?.DeviceID || l?.device_id || l?.device?.device_id || "").toLowerCase();
  if (dev.includes("out")) return true;
  if (dev.includes("in")) return false;
  return null;
}

// Multi (2), Auto (3) and Split (5) shifts allow multiple in/out
// sessions per day. For those we ignore the device's reported direction
// and alternate IN/OUT/IN/OUT by punch time — exactly how attendance
// pairs raw punches into sessions.
//
// Single (6), FILO (1) and Night (4) are single-session: 1 IN + 1 OUT
// per day. Extra punches on those shifts are duplicates from the
// reader, so we trust the device's direction as-is (the duplicates
// correctly stay as OUT or IN as the device reported).
function getShiftTypeId(l) {
  return (
    l?.employee?.schedule?.shift_type_id ??
    l?.employee?.shift_type_id ??
    l?.shift_type_id ??
    null
  );
}
function isMultiSessionShift(l) {
  const id = getShiftTypeId(l);
  const n = typeof id === "string" ? parseInt(id, 10) : id;
  return n === 2 || n === 3 || n === 5;
}

function classifyLogs(logs) {
  // Phase 1: Multi/Auto/Split → null (will alternate). Others → trust device.
  const enriched = logs.map((l) => ({
    ...l,
    _isOut: isMultiSessionShift(l) ? null : explicitIsOut(l),
  }));

  // Phase 2: alternate IN/OUT for unresolved logs per (employee, date).
  const groups = new Map();
  for (const l of enriched) {
    if (l._isOut !== null) continue;
    const empKey = l?.employee?.id ?? l?.employee?.employee_id ?? l?.employee?.system_user_id ?? "?";
    const date = l?.date || (l?.LogTime ? String(l.LogTime).slice(0, 10) : "");
    const key = `${empKey}|${date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const ta = `${a?.date || ""} ${a?.time || ""}`;
      const tb = `${b?.date || ""} ${b?.time || ""}`;
      return ta.localeCompare(tb);
    });
    list.forEach((l, idx) => { l._isOut = idx % 2 === 1; });
  }

  // Phase 3: anything still null (no shift type AND no device signal)
  // defaults to IN.
  enriched.forEach((l) => { if (l._isOut === null) l._isOut = false; });

  return enriched;
}

function Breakdown({ employees, visitors }) {
  const { t } = useTranslation();
  return (
    <>
      <span className="inline-flex items-center gap-1.5 font-sans">
        <User className="h-3.5 w-3.5" />
        <span>{t("accessControl.breakdown.employees")}</span>
        <span className="font-semibold">{employees}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 font-sans">
        <UserPlus className="h-3.5 w-3.5" />
        <span>{t("accessControl.breakdown.visitors")}</span>
        <span className="font-semibold">{visitors}</span>
      </span>
    </>
  );
}

export default function AccessControlPage() {
  const { t } = useTranslation();
  const user = getUser();
  const canCreate = can(user, "access_control", "access_control", "create");
  const canEdit   = can(user, "access_control", "access_control", "edit");
  const canDelete = can(user, "access_control", "access_control", "delete");
  const canView   = can(user, "access_control", "access_control", "view");
  const [filters, setFilters] = useState({
    branchIds: [],
    deviceIds: [],
    userType: null,
    employeeIds: [],
    fromDate: todayStr(),
    toDate: todayStr(),
  });
  const [view, setView] = useState("all");

  // Filter dropdown sources
  const [branches, setBranches] = useState([]);
  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Data
  const [empLogs, setEmpLogs] = useState([]);
  const [visitorLogs, setVisitorLogs] = useState([]);
  const [allDevices, setAllDevices] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [devicePinModal, setDevicePinModal] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [openedDoors, setOpenedDoors] = useState({});
  const [empLogsOpen, setEmpLogsOpen] = useState(false);
  const [empLogsRecord, setEmpLogsRecord] = useState(null);
  const [empLogsList, setEmpLogsList] = useState([]);
  const [empLogsLoading, setEmpLogsLoading] = useState(false);

  // ── Initial loads ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const b = await getBranches();
        const seen = new Set();
        const unique = (Array.isArray(b) ? b : [])
          .filter((x) => x?.id != null && !seen.has(x.id) && seen.add(x.id));
        setBranches(unique);
      } catch (e) { console.warn("branches", e); }
    })();
  }, []);

  // Load ALL devices once on mount — independent of filter changes.
  useEffect(() => {
    (async () => {
      try {
        const r = await getDevices({ per_page: 500 });
        const list = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
        setAllDevices(list);
        const seen = new Set();
        const dropdownItems = list
          .filter((d) => d?.device_id != null && !seen.has(d.device_id) && seen.add(d.device_id))
          .map((d) => ({ name: d.name, id: d.device_id }));
        setDevices(dropdownItems);
      } catch (e) { console.warn("devices", e); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // For multi-select branches: pass first selected branch (API takes single), else null for all
        const branchForList = filters.branchIds?.[0] ?? null;
        const r = await getScheduledEmployeeList(branchForList);
        const seen = new Set();
        const list = (r || [])
          .map((e) => {
            const id = e?.system_user_id ?? e?.id ?? e?.employee_id;
            const name = e?.full_name || [e?.first_name, e?.last_name].filter(Boolean).join(" ") || `Employee ${id}`;
            return { name, id };
          })
          .filter((x) => x.id != null && !seen.has(x.id) && seen.add(x.id));
        setEmployees(list);
      } catch (e) { console.warn("employees dropdown", e); }
    })();
  }, [filters.branchIds]);

  // ── Fetch data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      // API takes single values; for multi-select, pass first or null when none/all selected
      const params = {
        page: 1,
        per_page: 500,
        sortDesc: "true",
        branch_id: filters.branchIds?.length === 1 ? filters.branchIds[0] : null,
        branch_ids: filters.branchIds?.length > 1 ? filters.branchIds : undefined,
        DeviceID: filters.deviceIds?.length === 1 ? filters.deviceIds[0] : null,
        from_date: filters.fromDate,
        to_date: filters.toDate,
        UserID: filters.employeeIds?.length === 1 ? filters.employeeIds[0] : null,
        include_device_types: ["all", "Access Control"],
        user_type: filters.userType,
      };
      const [empRes, visRes] = await Promise.all([
        getAccessControlReport(params).catch((e) => { console.warn("emp logs", e); return { data: [] }; }),
        getVisitorLogs({ per_page: 500, date: filters.fromDate }).catch((e) => { console.warn("visitor logs", e); return { data: [] }; }),
      ]);
      setEmpLogs(Array.isArray(empRes?.data) ? empRes.data : []);
      setVisitorLogs(Array.isArray(visRes?.data) ? visRes.data : []);
    } catch (e) {
      notify(t("accessControl.notify.errorTitle"), parseApiError(e), "error");
    } finally {
      setIsLoading(false);
    }
  }, [filters, t]);

  useEffect(() => { fetchAll(); }, []); // initial

  // ── Auto-classified logs (IN/OUT alternation when device sends no signal) ─
  const classifiedLogs = useMemo(() => classifyLogs(empLogs), [empLogs]);

  // ── Derive KPIs ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const empIns = classifiedLogs.filter((l) => !l._isOut);
    const empOuts = classifiedLogs.filter((l) => l._isOut);

    // Employees currently inside: last event per employee is IN
    const tsOf = (l) => {
      const t = new Date(l?.LogTime || `${l?.date || ""} ${l?.time || ""}`.trim()).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const lastByEmp = new Map();
    for (const l of [...classifiedLogs].sort((a, b) => tsOf(a) - tsOf(b))) {
      const key = l?.employee?.id ?? l?.employee?.employee_id ?? l?.employee?.system_user_id;
      if (key != null) lastByEmp.set(key, l);
    }
    const empInside = [...lastByEmp.values()].filter((l) => !l._isOut).length;

    // Visitor counts (today's data)
    const visIns = visitorLogs.length;
    const visOuts = visitorLogs.filter((v) => !!v.out).length;
    const visInside = visitorLogs.filter((v) => !v.out).length;

    // Devices
    const totalDevices = allDevices.length;
    const onlineDevices = allDevices.filter((d) => d.status_id == 1).length;
    const offlineDevices = totalDevices - onlineDevices;

    // Last log time
    const lastEmp = classifiedLogs[0];
    const lastTs = lastEmp ? `${lastEmp.date || ""} ${lastEmp.time || ""}`.trim() : "";

    return {
      empIns: empIns.length, empOuts: empOuts.length, empInside,
      visIns, visOuts, visInside,
      totalIns: empIns.length + visIns,
      totalOuts: empOuts.length + visOuts,
      totalInside: empInside + visInside,
      totalDevices, onlineDevices, offlineDevices,
      lastTs,
    };
  }, [classifiedLogs, visitorLogs, allDevices]);

  // ── KPI click filtering ────────────────────────────────────────────────
  const tableLogs = useMemo(() => {
    switch (view) {
      case "in":  return classifiedLogs.filter((l) => !l._isOut);
      case "out": return classifiedLogs.filter((l) => l._isOut);
      case "inside": {
        const tsOf = (l) => {
          const t = new Date(l?.LogTime || `${l?.date || ""} ${l?.time || ""}`.trim()).getTime();
          return Number.isFinite(t) ? t : 0;
        };
        const lastByEmp = new Map();
        for (const l of [...classifiedLogs].sort((a, b) => tsOf(a) - tsOf(b))) {
          const key = l?.employee?.id ?? l?.employee?.employee_id ?? l?.employee?.system_user_id;
          if (key != null) lastByEmp.set(key, l);
        }
        return [...lastByEmp.values()].filter((l) => !l._isOut);
      }
      default: return classifiedLogs;
    }
  }, [classifiedLogs, view]);

  // ── Show last 10 logs for an employee (across all time, not just today) ─
  const handleRowClick = useCallback(async (log) => {
    const emp = log?.employee;
    if (!emp) return;
    setEmpLogsRecord(emp);
    setEmpLogsOpen(true);
    setEmpLogsLoading(true);
    setEmpLogsList([]);
    try {
      const userId = emp.system_user_id ?? emp.employee_id ?? emp.id;
      // 10-day window for stats (presents, absence, etc.)
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 9);
      const fmt = (d) => d.toISOString().slice(0, 10);
      const params = {
        page: 1,
        per_page: 500,
        sortDesc: "true",
        UserID: userId,
        from_date: fmt(start),
        to_date: fmt(end),
        include_device_types: ["all", "Access Control"],
      };
      const r = await getAccessControlReport(params);
      const all = Array.isArray(r?.data) ? r.data : [];
      const tsOf = (l) => {
        const t = new Date(l?.LogTime || `${l?.date || ""} ${l?.time || ""}`.trim()).getTime();
        return Number.isFinite(t) ? t : 0;
      };
      all.sort((a, b) => tsOf(b) - tsOf(a));
      setEmpLogsList(all);
    } catch (e) {
      notify(t("accessControl.notify.errorTitle"), parseApiError(e), "error");
    } finally {
      setEmpLogsLoading(false);
    }
  }, [t]);

  // ── Emergency Exit: PIN verified → open all doors ─────────────────────
  const handleOpenAllDoors = async () => {
    let success = 0, failed = 0;
    await Promise.all(allDevices.map(async (d) => {
      try {
        const r = await openDoor({ device_id: d.device_id });
        if (r?.status === false) failed++; else success++;
      } catch { failed++; }
    }));
    setPinOpen(false);
    let msg = t("accessControl.notify.doorsOpened", { count: success });
    if (failed) msg += " " + t("accessControl.notify.doorsFailed", { count: failed });
    notify(
      t("accessControl.notify.emergencyExitTitle"),
      msg,
      failed ? "warning" : "success"
    );
  };

  // ── Refresh device health ──────────────────────────────────────────────
  const refreshDeviceHealth = async () => {
    try {
      const user = await getUser();
      await checkDeviceHealth(user?.company_id);
      const r = await getDevices({ per_page: 500 });
      const list = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
      setAllDevices(list);
      notify(t("accessControl.notify.deviceHealthTitle"), t("accessControl.notify.healthComplete"), "success");
    } catch (e) {
      notify(t("accessControl.notify.healthFailedTitle"), parseApiError(e), "error");
    }
  };

  return (
    <div className="px-6 py-6">
      <h1 className="text-2xl font-extrabold text-foreground mb-6">{t("accessControl.title")}</h1>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onSubmit={fetchAll}
        onReset={() => {
          setFilters({ branchIds: [], deviceIds: [], userType: null, employeeIds: [], fromDate: todayStr(), toDate: todayStr() });
          setView("all");
        }}
        branches={branches}
        devices={devices}
        employees={employees}
        isLoading={isLoading}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          label={t("accessControl.kpi.totalEntries")}
          value={stats.totalIns.toLocaleString()}
          icon={LogIn}
          accent="green"
          active={view === "in"}
          onClick={() => setView(view === "in" ? "all" : "in")}
          footer={<Breakdown employees={stats.empIns} visitors={stats.visIns} />}
        />
        <KpiCard
          label={t("accessControl.kpi.totalExits")}
          value={stats.totalOuts.toLocaleString()}
          icon={LogOut}
          accent="red"
          active={view === "out"}
          onClick={() => setView(view === "out" ? "all" : "out")}
          footer={<Breakdown employees={stats.empOuts} visitors={stats.visOuts} />}
        />
        <KpiCard
          label={t("accessControl.kpi.peopleInside")}
          value={stats.totalInside.toLocaleString()}
          icon={Users}
          accent="purple"
          active={view === "inside"}
          onClick={() => setView(view === "inside" ? "all" : "inside")}
          footer={<Breakdown employees={stats.empInside} visitors={stats.visInside} />}
        />
        <KpiCard
          label={t("accessControl.kpi.visitors")}
          value={(stats.visIns + stats.visInside).toLocaleString()}
          hint={t("accessControl.kpi.onSite", { count: stats.visInside })}
          icon={UserPlus}
          accent="blue"
        />
        <KpiCard
          label={t("accessControl.kpi.activeDevices")}
          value={`${stats.onlineDevices}/${stats.totalDevices}`}
          hint={t("accessControl.kpi.onlineTerminals")}
          icon={Server}
          accent="indigo"
        />
        <KpiCard
          label={t("accessControl.kpi.deviceHealth")}
          value={stats.offlineDevices > 0 ? t("accessControl.kpi.attention") : t("accessControl.kpi.healthy")}
          hint={t("accessControl.kpi.offlineCount", { count: stats.offlineDevices })}
          icon={Activity}
          accent="green"
          largeText
        />
        <KpiCard
          label={t("accessControl.kpi.emergencyExit")}
          value={t("accessControl.kpi.unlockAllDoors")}
          icon={Siren}
          accent="red"
          emergency
          largeText
          footer={
            <span className="inline-flex items-center gap-2" style={{ color: "#ffb0b0" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "#ef4444", boxShadow: "0 0 0 4px rgba(239,68,68,.18)" }} />
              <span>{t("accessControl.kpi.standby")}</span>
            </span>
          }
          cta={
            canEdit && (
            <button
              onClick={() => {
                if (!allDevices.length) {
                  notify(t("accessControl.notify.noDevicesTitle"), t("accessControl.notify.noDevicesMsg"), "info");
                  return;
                }
                setPinOpen(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-white transition-all"
              style={{
                height: 38,
                background: "linear-gradient(180deg, #ff7a59, #ef4444)",
                boxShadow: "0 6px 14px -8px rgba(239,68,68,.7)",
              }}
            >
              <Lock className="h-3.5 w-3.5" /> {t("accessControl.kpi.unlockNow")}
            </button>
            )
          }
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        <LogTable
          logs={tableLogs}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          filters={filters}
          branches={branches}
          devices={devices}
          employees={employees}
        />
        <DeviceHealthPanel
          devices={allDevices}
          openedDoors={openedDoors}
          onOpenDoor={(d) => {
            setActiveDeviceId(d.device_id);
            setDevicePinModal(true);
          }}
          onCloseDoor={async (d) => {
            try {
              const r = await closeDoor({ device_id: d.device_id });
              if (r?.status) {
                notify(t("accessControl.notify.successTitle"), r?.message || t("accessControl.notify.doorClosed"), "success");
                setOpenedDoors((prev) => {
                  const next = { ...prev };
                  delete next[d.device_id];
                  return next;
                });
              } else {
                notify(t("accessControl.notify.failedTitle"), t("accessControl.notify.doorCloseFailed"), "error");
              }
            } catch (e) {
              notify(t("accessControl.notify.errorTitle"), parseApiError(e), "error");
            }
          }}
          onRefresh={refreshDeviceHealth}
        />
      </section>

      <EmergencyPinDialog
        open={pinOpen}
        onCancel={() => setPinOpen(false)}
        onUnlock={handleOpenAllDoors}
        deviceCount={allDevices.length}
      />

      <EmployeeLogsDialog
        open={empLogsOpen}
        onClose={() => setEmpLogsOpen(false)}
        employee={empLogsRecord}
        logs={empLogsList}
        loading={empLogsLoading}
      />

      <PinEntryModal
        device_id={activeDeviceId}
        pinModal={devicePinModal}
        setPinModal={setDevicePinModal}
        onSuccess={async (pin) => {
          try {
            const r = await openDoor({ device_id: activeDeviceId, otp: pin });
            if (r?.status) {
              notify(t("accessControl.notify.successTitle"), r?.message || t("accessControl.notify.doorOpened"), "success");
              setOpenedDoors((prev) => ({ ...prev, [activeDeviceId]: true }));
            } else {
              notify(t("accessControl.notify.failedTitle"), t("accessControl.notify.doorOpenFailed"), "error");
            }
          } catch (e) {
            notify(t("accessControl.notify.errorTitle"), parseApiError(e), "error");
          } finally {
            setDevicePinModal(false);
          }
        }}
      />
    </div>
  );
}
