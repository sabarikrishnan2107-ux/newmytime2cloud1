"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
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
import { parseApiError, notify } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function Breakdown({ employees, visitors }) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5 font-sans">
        <User className="h-3.5 w-3.5" />
        <span>Employees</span>
        <span className="font-semibold">{employees}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 font-sans">
        <UserPlus className="h-3.5 w-3.5" />
        <span>Visitors</span>
        <span className="font-semibold">{visitors}</span>
      </span>
    </>
  );
}

export default function AccessControlPage() {
  const [filters, setFilters] = useState({
    branchId: null,
    deviceId: null,
    userType: null,
    employeeId: null,
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
        const r = await getScheduledEmployeeList(filters.branchId);
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
  }, [filters.branchId]);

  // ── Fetch data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: 1,
        per_page: 500,
        sortDesc: "true",
        branch_id: filters.branchId,
        DeviceID: filters.deviceId,
        from_date: filters.fromDate,
        to_date: filters.toDate,
        UserID: filters.employeeId,
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
      notify("Error", parseApiError(e), "error");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAll(); }, []); // initial

  // ── Derive KPIs ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const isOut = (l) => {
      const f = (l?.device?.function || "").toLowerCase();
      const t = (l?.log_type || l?.LogType || "").toLowerCase();
      if (f === "out" || t === "out") return true;
      if (f === "in" || t === "in") return false;
      // function is "all"/"auto"/missing — fall back to deviceId hint
      const dev = String(l?.DeviceID || l?.device_id || l?.device?.device_id || "").toLowerCase();
      return !dev.includes("in");
    };
    const empIns = empLogs.filter((l) => !isOut(l));
    const empOuts = empLogs.filter((l) => isOut(l));

    // Employees currently inside: last event per employee is IN
    const tsOf = (l) => {
      const t = new Date(l?.LogTime || `${l?.date || ""} ${l?.time || ""}`.trim()).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const lastByEmp = new Map();
    for (const l of [...empLogs].sort((a, b) => tsOf(a) - tsOf(b))) {
      const key = l?.employee?.id ?? l?.employee?.employee_id ?? l?.employee?.system_user_id;
      if (key != null) lastByEmp.set(key, l);
    }
    const empInside = [...lastByEmp.values()].filter((l) => !isOut(l)).length;

    // Visitor counts (today's data)
    const visIns = visitorLogs.length;
    const visOuts = visitorLogs.filter((v) => !!v.out).length;
    const visInside = visitorLogs.filter((v) => !v.out).length;

    // Devices
    const totalDevices = allDevices.length;
    const onlineDevices = allDevices.filter((d) => d.status_id == 1).length;
    const offlineDevices = totalDevices - onlineDevices;

    // Last log time
    const lastEmp = empLogs[0];
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
  }, [empLogs, visitorLogs, allDevices]);

  // ── KPI click filtering ────────────────────────────────────────────────
  const tableLogs = useMemo(() => {
    const isOut = (l) => {
      const f = (l?.device?.function || "").toLowerCase();
      const t = (l?.log_type || l?.LogType || "").toLowerCase();
      if (f === "out" || t === "out") return true;
      if (f === "in" || t === "in") return false;
      const dev = String(l?.DeviceID || l?.device_id || l?.device?.device_id || "").toLowerCase();
      return !dev.includes("in");
    };
    switch (view) {
      case "in":  return empLogs.filter((l) => !isOut(l));
      case "out": return empLogs.filter((l) => isOut(l));
      case "inside": {
        const tsOf = (l) => {
          const t = new Date(l?.LogTime || `${l?.date || ""} ${l?.time || ""}`.trim()).getTime();
          return Number.isFinite(t) ? t : 0;
        };
        const lastByEmp = new Map();
        for (const l of [...empLogs].sort((a, b) => tsOf(a) - tsOf(b))) {
          const key = l?.employee?.id ?? l?.employee?.employee_id ?? l?.employee?.system_user_id;
          if (key != null) lastByEmp.set(key, l);
        }
        return [...lastByEmp.values()].filter((l) => !isOut(l));
      }
      default: return empLogs;
    }
  }, [empLogs, view]);

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
      notify("Error", parseApiError(e), "error");
    } finally {
      setEmpLogsLoading(false);
    }
  }, []);

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
    notify(
      "Emergency Exit",
      `${success} door${success !== 1 ? "s" : ""} opened${failed ? `, ${failed} failed` : ""}.`,
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
      notify("Device Health", "Health check complete", "success");
    } catch (e) {
      notify("Health Check Failed", parseApiError(e), "error");
    }
  };

  return (
    <div className="px-6 py-6">
      <h1 className="text-2xl font-extrabold text-foreground mb-6">Access Control</h1>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onSubmit={fetchAll}
        onReset={() => {
          setFilters({ branchId: null, deviceId: null, userType: null, employeeId: null, fromDate: todayStr(), toDate: todayStr() });
          setView("all");
        }}
        branches={branches}
        devices={devices}
        employees={employees}
        isLoading={isLoading}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          label="TOTAL ENTRIES"
          value={stats.totalIns.toLocaleString()}
          icon={LogIn}
          accent="green"
          active={view === "in"}
          onClick={() => setView(view === "in" ? "all" : "in")}
          footer={<Breakdown employees={stats.empIns} visitors={stats.visIns} />}
        />
        <KpiCard
          label="TOTAL EXITS"
          value={stats.totalOuts.toLocaleString()}
          icon={LogOut}
          accent="red"
          active={view === "out"}
          onClick={() => setView(view === "out" ? "all" : "out")}
          footer={<Breakdown employees={stats.empOuts} visitors={stats.visOuts} />}
        />
        <KpiCard
          label="PEOPLE INSIDE"
          value={stats.totalInside.toLocaleString()}
          icon={Users}
          accent="purple"
          active={view === "inside"}
          onClick={() => setView(view === "inside" ? "all" : "inside")}
          footer={<Breakdown employees={stats.empInside} visitors={stats.visInside} />}
        />
        <KpiCard
          label="VISITORS"
          value={(stats.visIns + stats.visInside).toLocaleString()}
          hint={`${stats.visInside} currently on-site`}
          icon={UserPlus}
          accent="blue"
        />
        <KpiCard
          label="ACTIVE DEVICES"
          value={`${stats.onlineDevices}/${stats.totalDevices}`}
          hint="Online terminals"
          icon={Server}
          accent="indigo"
        />
        <KpiCard
          label="DEVICE HEALTH"
          value={stats.offlineDevices > 0 ? "Attention" : "Healthy"}
          hint={`${stats.offlineDevices} offline`}
          icon={Activity}
          accent="green"
          largeText
        />
        <KpiCard
          label="EMERGENCY EXIT"
          value="Unlock All Doors"
          icon={Siren}
          accent="red"
          emergency
          largeText
          footer={
            <span className="inline-flex items-center gap-2" style={{ color: "#ffb0b0" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "#ef4444", boxShadow: "0 0 0 4px rgba(239,68,68,.18)" }} />
              <span>Stand-by</span>
            </span>
          }
          cta={
            <button
              onClick={() => {
                if (!allDevices.length) {
                  notify("No Devices", "No registered devices to unlock.", "info");
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
              <Lock className="h-3.5 w-3.5" /> Unlock Now
            </button>
          }
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        <LogTable logs={tableLogs} isLoading={isLoading} onRowClick={handleRowClick} />
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
                notify("Success", r?.message || "Door closed", "success");
                setOpenedDoors((prev) => {
                  const next = { ...prev };
                  delete next[d.device_id];
                  return next;
                });
              } else {
                notify("Failed", "Door close command failed", "error");
              }
            } catch (e) {
              notify("Error", parseApiError(e), "error");
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
              notify("Success", r?.message || "Door opened", "success");
              setOpenedDoors((prev) => ({ ...prev, [activeDeviceId]: true }));
            } else {
              notify("Failed", "Door open command failed", "error");
            }
          } catch (e) {
            notify("Error", parseApiError(e), "error");
          } finally {
            setDevicePinModal(false);
          }
        }}
      />
    </div>
  );
}
