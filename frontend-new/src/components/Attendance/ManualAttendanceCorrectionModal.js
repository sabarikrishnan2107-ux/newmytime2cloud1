"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DropDown from "@/components/ui/DropDown";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import { getBranches, getDepartments, getDeviceLogs, getScheduledEmployeeList, regenerateReport } from "@/lib/api";
import { generateManualLog, getEmployeeRelatedShift } from "@/lib/endpoint/attendance";
import { notify, parseApiError } from "@/lib/utils";
import { getUser } from "@/config";

const defaultEmployee = {
    name: "Employee",
    code: "---",
    department: "---",
    avatar: "",
    issueLabel: "Clock-out Missing",
    shift_type_id: 1,
};

const defaultForm = {
    date: "",
    shiftLabel: "Standard (09:00 - 18:00)",
    reason: "Card Forgotten",
    note: "",
    in1: "00:00",
    out1: "00:00",
    in2: "00:00",
    out2: "00:00",
};

const reasons = [
    "Card Forgotten",
    "System Malfunction",
    "Remote Work Approval",
    "Late Arrival Authorized",
    "Other",
];

const pickFirst = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return "";
};

const timeToMinutes = (value) => {
    if (!value) return null;
    const text = String(value).trim();

    const hhmm = text.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) {
        const hours = Number(hhmm[1]);
        const mins = Number(hhmm[2]);
        if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
        return hours * 60 + mins;
    }

    const ampm = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampm) {
        let hours = Number(ampm[1]) % 12;
        const mins = Number(ampm[2]);
        const suffix = ampm[3].toUpperCase();
        if (suffix === "PM") hours += 12;
        if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
        return hours * 60 + mins;
    }

    return null;
};

const toDurationLabel = (start, end) => {
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    if (startMins === null || endMins === null) return "--";

    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60;

    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
};

const firstItem = (value) => (Array.isArray(value) ? value[0] : value);

export default function ManualAttendanceCorrectionModal({
    open = false,
    onClose = () => { },
    onSuccess,
    initialData = {},
}) {
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        ...defaultForm,
        ...initialData,
    });
    const [evidenceName, setEvidenceName] = useState("");
    const [relatedShift, setRelatedShift] = useState(null);
    const [logCount, setLogCount] = useState(0);
    const [missingFieldKey, setMissingFieldKey] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");

    // Fetch branches and departments
    useEffect(() => {
        if (!open) return;
        const fetchFilters = async () => {
            try {
                const [branchData, deptData] = await Promise.all([getBranches(), getDepartments()]);
                setBranches((branchData || []).map((b) => ({ id: b.id, name: b.branch_name || b.name })));
                setDepartments((deptData || []).map((d) => ({ id: d.id, name: d.name })));
            } catch (_) {}
        };
        fetchFilters();
    }, [open]);

    // Fetch employees (filtered by branch/department)
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const fetchEmployees = async () => {
            try {
                const departmentIds = selectedDepartment ? [selectedDepartment] : [];
                const result = await getScheduledEmployeeList(departmentIds);
                if (!cancelled) {
                    let data = (result || []).map((e) => ({ ...e, name: e.full_name || e.name }));
                    // Filter by branch if selected
                    if (selectedBranch) {
                        data = data.filter((e) => String(e.branch_id) === String(selectedBranch));
                    }
                    setEmployees(data);
                }
            } catch (_) {
                if (!cancelled) setEmployees([]);
            }
        };
        fetchEmployees();
        return () => { cancelled = true; };
    }, [open, selectedBranch, selectedDepartment]);

    const employeeOptions = useMemo(() => {
        if (!Array.isArray(employees) || employees.length === 0) return [];

        return employees.map((item, index) => {
            const schedule = firstItem(item?.schedule);
            const scheduleActive = firstItem(item?.schedule_active);
            const scheduleShift = firstItem(schedule?.shift);
            const activeShift = firstItem(scheduleActive?.shift);

            return {
                id: item?.system_user_id ?? item?.user_id ?? item?.id ?? item?.employee_id ?? `emp-${index}`,
                name: item?.full_name || item?.name || "Employee",
                code: item?.employee_id || item?.code || "---",
                branchId: item?.branch_id ?? 0,
                department: item?.department?.name || item?.department || "---",
                avatar: item?.profile_picture || item?.avatar || "",
                issueLabel: item?.issueLabel || "Clock-out Missing",
                shift_type_id: Number(pickFirst(
                    activeShift?.shift_type_id,
                    scheduleShift?.shift_type_id,
                    item?.shift?.shift_type_id,
                    1
                )),
                shiftName: pickFirst(
                    activeShift?.name,
                    activeShift?.shift_name,
                    scheduleShift?.name,
                    scheduleShift?.shift_name,
                    scheduleActive?.name,
                    item?.shift_name,
                    item?.shift?.name,
                    item?.shift?.shift_name,
                    item?.shiftLabel,
                    "Standard"
                ),
                onDutyTime: pickFirst(
                    activeShift?.on_duty_time,
                    scheduleShift?.on_duty_time,
                    scheduleActive?.on_duty_time,
                    schedule?.on_duty_time,
                    item?.on_duty_time,
                    item?.shift?.on_duty_time,
                    item?.duty_start
                ),
                offDutyTime: pickFirst(
                    activeShift?.off_duty_time,
                    scheduleShift?.off_duty_time,
                    scheduleActive?.off_duty_time,
                    schedule?.off_duty_time,
                    item?.off_duty_time,
                    item?.shift?.off_duty_time,
                    item?.duty_end
                ),
            };
        });
    }, [employees]);

    const reasonOptions = useMemo(
        () => reasons.map((reason) => ({ id: reason, name: reason })),
        []
    );

    const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeOptions[0]?.id || "");

    useEffect(() => {
        setSelectedEmployeeId(employeeOptions[0]?.id || "");
    }, [employeeOptions]);

    const activeEmployee = useMemo(() => {
        return employeeOptions.find((item) => String(item.id) === String(selectedEmployeeId)) || employeeOptions[0] || defaultEmployee;
    }, [employeeOptions, selectedEmployeeId]);

    useEffect(() => {
        let isDisposed = false;

        const fetchRelatedShift = async () => {
            if (!selectedEmployeeId) {
                setRelatedShift(null);
                return;
            }

            try {
                const data = await getEmployeeRelatedShift(selectedEmployeeId);
                if (!isDisposed) {
                    setRelatedShift(data || null);
                }
            } catch (_) {
                if (!isDisposed) {
                    setRelatedShift(null);
                }
            }
        };

        fetchRelatedShift();

        return () => {
            isDisposed = true;
        };
    }, [selectedEmployeeId]);

    // LOGIC: Check current shift_type_id
    const currentShiftTypeId = Number(relatedShift?.shift_type_id || activeEmployee?.shift_type_id || 1);
    const showSecondPair = [2, 5].includes(currentShiftTypeId);

    useEffect(() => {
        const shiftName = pickFirst(relatedShift?.shift_name, activeEmployee?.shiftName, "Standard");
        const onDutyTime = pickFirst(relatedShift?.on_duty_time, activeEmployee?.onDutyTime);
        const offDutyTime = pickFirst(relatedShift?.off_duty_time, activeEmployee?.offDutyTime);

        const nextShiftTiming = onDutyTime && offDutyTime
            ? `${onDutyTime} - ${offDutyTime}`
            : "";

        setForm((prev) => ({
            ...prev,
            shiftLabel: nextShiftTiming ? `${shiftName} (${nextShiftTiming})` : shiftName,
        }));
    }, [activeEmployee, relatedShift]);

    const shiftDurationLabel = useMemo(() => {
        return toDurationLabel(
            pickFirst(relatedShift?.on_duty_time, activeEmployee?.onDutyTime),
            pickFirst(relatedShift?.off_duty_time, activeEmployee?.offDutyTime)
        );
    }, [activeEmployee, relatedShift]);

    useEffect(() => {
        let isDisposed = false;

        const detectMissingPunchByLogs = async () => {
            if (!open || !selectedEmployeeId || !form.date) {
                setLogCount(0);
                setMissingFieldKey(null);
                return;
            }

            try {
                const response = await getDeviceLogs({
                    page: 1,
                    sortDesc: false,
                    per_page: 1000,
                    UserID: selectedEmployeeId,
                    from_date: form.date,
                    to_date: form.date,
                    from_date_txt: form.date,
                    to_date_txt: form.date,
                });

                const totalLogs = typeof response?.total === "number"
                    ? response.total
                    : Array.isArray(response?.data)
                        ? response.data.length
                        : Array.isArray(response)
                            ? response.length
                            : 0;

                const nextSlotByCount = ["in1", "out1", "in2", "out2"];
                const nextSlot = nextSlotByCount[totalLogs] || null;

                if (!isDisposed) {
                    setLogCount(totalLogs);
                    setMissingFieldKey(nextSlot);
                }
            } catch (_) {
                if (!isDisposed) {
                    setLogCount(0);
                    setMissingFieldKey("in1");
                }
            }
        };

        detectMissingPunchByLogs();

        return () => {
            isDisposed = true;
        };
    }, [open, selectedEmployeeId, form.date]);

    if (!open) return null;

    const setField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const clearManualTimes = () => {
        setForm((prev) => ({
            ...prev,
            in1: "",
            out1: "",
            in2: "",
            out2: "",
        }));
    };

    const onFileSelect = (event) => {
        const file = event.target.files?.[0];
        setEvidenceName(file?.name || "");
    };

    const resolveLogType = async (user_id) => {
        const response = await getDeviceLogs({
            page: 1,
            per_page: 1,
            sortDesc: true,
            UserID: user_id,
        });

        const latest = Array.isArray(response?.data)
            ? response.data?.[0]
            : Array.isArray(response)
                ? response?.[0]
                : null;

        const latestType = String(latest?.log_type || "").toLowerCase();
        return ["in", "auto"].includes(latestType) ? "out" : "in";
    };

    const handleApply = async () => {
        const nextRequiredTime = missingFieldKey ? form?.[missingFieldKey] : "";
        const fallbackTime = ["in1", "out1", "in2", "out2"].map((key) => form?.[key]).find((value) => !!value);

        const user_id = selectedEmployeeId;
        const branch_id = activeEmployee?.branchId ?? 0;
        const date = form?.date || "";
        const time = nextRequiredTime || fallbackTime || "";

        if (!user_id || !date || !time) {
            notify("Warning", "Please select employee, date, and time.", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            const user = getUser();

            // Collect all filled time slots
            const timeSlots = [];
            if (form?.in1 && form.in1 !== "00:00") timeSlots.push({ time: form.in1, type: "in" });
            if (form?.out1 && form.out1 !== "00:00") timeSlots.push({ time: form.out1, type: "out" });
            if (form?.in2 && form.in2 !== "00:00") timeSlots.push({ time: form.in2, type: "in" });
            if (form?.out2 && form.out2 !== "00:00") timeSlots.push({ time: form.out2, type: "out" });

            // If no specific slots filled, use the resolved log type with fallback time
            if (timeSlots.length === 0) {
                const log_type = await resolveLogType(user_id);
                timeSlots.push({ time, type: log_type });
            }

            let lastResponse = null;

            for (const slot of timeSlots) {
                const log_payload = {
                    branch_id,
                    UserID: user_id,
                    LogTime: date + " " + slot.time,
                    DeviceID: "Manual",
                    company_id: user?.company_id,
                    log_type: slot.type,
                    shift_type_id: currentShiftTypeId,
                    reason: form?.reason || null,
                    note: form?.note || null,
                };

                // Attach evidence file only to the first log
                if (slot === timeSlots[0]) {
                    const file = fileInputRef.current?.files?.[0];
                    if (file) {
                        log_payload.attachment = file;
                    }
                }

                lastResponse = await generateManualLog(log_payload);

                if (lastResponse?.status === false) {
                    notify("Error", (lastResponse?.message || "Unable to submit manual log."), "error");
                    return;
                }
            }

            notify("Saved", lastResponse?.message || "Correction submitted successfully.", "success");

            try {
                await regenerateReport({
                    dates: [date, date],
                    UserIds: [user_id],
                    company_ids: [user?.company_id],
                    user_id: user?.id,
                    updated_by: user?.id,
                    reason: form?.reason || null,
                    employee_ids: [user_id],
                    shift_type_id: currentShiftTypeId,
                });
            } catch (_) {
                // Regeneration failure should not block the success flow
            }

            onClose?.();
            // Small delay to let backend finish processing before refreshing
            await new Promise(resolve => setTimeout(resolve, 1000));
            onSuccess?.();
        } catch (error) {
            notify("Error", parseApiError(error), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-auto">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">event_busy</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Correct Attendance Log</h1>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Branch & Department Filters */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Branch</label>
                            <DropDown
                                items={[{ id: "", name: "All Branches" }, ...branches]}
                                value={selectedBranch}
                                onChange={(value) => { setSelectedBranch(value || ""); setSelectedEmployeeId(""); }}
                                placeholder="All Branches"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Department</label>
                            <DropDown
                                items={[{ id: "", name: "All Departments" }, ...departments]}
                                value={selectedDepartment}
                                onChange={(value) => { setSelectedDepartment(value || ""); setSelectedEmployeeId(""); }}
                                placeholder="All Departments"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Employee</label>
                        <DropDown
                            items={employeeOptions.map((emp) => ({
                                id: String(emp.id),
                                name: `${emp.name} (${emp.code})`,
                            }))}
                            value={String(selectedEmployeeId)}
                            onChange={(value) => setSelectedEmployeeId(String(value || ""))}
                            placeholder="Select Employee"
                            width="w-full"
                        />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {activeEmployee.avatar ? (
                                    <img alt={activeEmployee.name} className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm" src={activeEmployee.avatar} />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center">
                                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-300">person</span>
                                    </div>
                                )}
                                <span className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-white leading-tight">{activeEmployee.name}</h2>
                                <div className="flex items-center gap-3 mt-1 text-sm">
                                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-xs uppercase tracking-wider">
                                        ID: {activeEmployee.code}
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-xs">corporate_fare</span>
                                        {activeEmployee.department}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Status Issue</span>
                            <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-sm font-medium border border-red-100 dark:border-red-900/30">
                                {activeEmployee.issueLabel}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Date Selection</label>
                                <DatePicker value={form.date} onChange={(value) => setField("date", value)} />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Shift Name</label>
                                <div className="relative group">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">schedule</span>
                                    <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-3 flex items-center justify-between text-slate-700 dark:text-slate-200 text-sm">
                                        <span>{form.shiftLabel}</span>
                                        <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{shiftDurationLabel}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Upload Evidence</label>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-slate-50 dark:bg-slate-900/30 hover:border-indigo-500/40 transition-colors cursor-pointer text-center group"
                                >
                                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors mb-2">cloud_upload</span>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase">PDF, JPG, PNG up to 5MB</p>
                                    {evidenceName && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{evidenceName}</p>}
                                </button>
                                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={onFileSelect} />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col relative">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Manual Punch Times</h3>
                                </div>
                                <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase underline underline-offset-4" onClick={clearManualTimes}>
                                    Clear All
                                </button>
                            </div>

                            <div className="mb-4 text-[11px] text-slate-500 dark:text-slate-400">
                                Logs found: <span className="font-semibold">{logCount}</span>
                                {missingFieldKey
                                    ? <span className="ml-2">• Next required: <span className="font-semibold uppercase">{missingFieldKey.replace("1", " 1").replace("2", " 2")}</span></span>
                                    : <span className="ml-2">• No pending slot in this form range</span>}
                            </div>

                            <div className="space-y-4 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <TimeField label="In 1" value={form.in1} onChange={(v) => setField("in1", v)} isMissing={missingFieldKey === "in1"} />
                                    <TimeField label="Out 1" value={form.out1} onChange={(v) => setField("out1", v)} isMissing={missingFieldKey === "out1"} />
                                </div>
                                {showSecondPair && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <TimeField label="In 2" value={form.in2} onChange={(v) => setField("in2", v)} isMissing={missingFieldKey === "in2"} />
                                        <TimeField label="Out 2" value={form.out2} onChange={(v) => setField("out2", v)} isMissing={missingFieldKey === "out2"} />
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div>
                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Reason for Correction</label>
                            <DropDown
                                items={reasonOptions}
                                value={form.reason}
                                onChange={(value) => setField("reason", value || "")}
                                placeholder="Select reason"
                                width="w-[420px]"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Supervisor Note</label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">edit_note</span>
                                <input
                                    type="text"
                                    value={form.note}
                                    onChange={(event) => setField("note", event.target.value)}
                                    placeholder="Add optional remarks..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 py-2.5 pl-10 pr-3"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span className="text-[11px] font-medium italic">Action will be logged in audit trail.</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            {isSubmitting ? "APPLYING..." : "APPLY CORRECTION"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TimeField({ label, value, onChange, isMissing = false }) {
    return (
        <div className="space-y-1 min-h-[86px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{label}</label>
            <div>
                <TimePicker
                    value={value}
                    onChange={onChange}
                    inputClassName={isMissing
                        ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/40 text-slate-500"
                        : ""
                    }
                />
                <div className="mt-1 h-3">
                    {isMissing ? (
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                            <span className="text-[10px] text-red-500 font-medium">Missing entry</span>
                        </div>
                    ) : (
                        <span className="invisible text-[10px]">placeholder</span>
                    )}
                </div>
            </div>
        </div>
    );
}