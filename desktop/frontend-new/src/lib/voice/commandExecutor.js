import { api, buildQueryParams } from "@/lib/api-client";

/**
 * Execute a data query command by calling the Laravel API.
 */
export async function executeDataQuery(command) {
  const params = await buildQueryParams({});
  const today = new Date().toISOString().split("T")[0];

  try {
    switch (command.intent) {
      case "absent_list":
        return await fetchDailyAttendance(params, today, "A", "Absent Employees");

      case "present_count":
        return await fetchDailyAttendance(params, today, "P", "Present Employees");

      case "late_list":
        return await fetchDailyAttendance(params, today, "LC", "Late Comers");

      case "attendance_summary":
        return await fetchAttendanceSummary(params, today);

      case "leave_requests":
        return await fetchLeaveRequests(params, false);

      case "on_leave_today":
        return await fetchLeaveRequests(params, true, today);

      case "change_requests":
        return await fetchChangeRequests(params);

      case "employee_count":
        return await fetchEmployeeCount(params);

      case "upcoming_holidays":
        return await fetchUpcomingHolidays(params);

      default:
        return { speech: "Sorry, I couldn't process that command.", data: null, label: "Error", type: "error" };
    }
  } catch (error) {
    console.error("Voice command error:", error);
    return { speech: "Sorry, there was an error. Please try again.", data: null, label: "Error", type: "error" };
  }
}

async function fetchDailyAttendance(params, date, statusFilter, label) {
  const { data } = await api.get("/company_stats_daily_attendance", {
    params: { ...params, from_date: date, to_date: date, per_page: 200 },
  });

  const records = Array.isArray(data?.data) ? data.data : [];

  let filtered = records;
  if (statusFilter === "A") {
    filtered = records.filter((r) => r.status === "A");
  } else if (statusFilter === "P") {
    filtered = records.filter((r) => ["P", "ME", "EG"].includes(r.status));
  } else if (statusFilter === "LC") {
    filtered = records.filter((r) => r.status === "LC" || (r.late_coming && r.late_coming !== "---"));
  }

  const employees = filtered.map((r) => ({
    name: r.employee_name || r.first_name || r.employee_id || "Unknown",
    employee_id: r.employee_id,
    branch: r.branch_name || "---",
    in: r.in || "---",
    out: r.out || "---",
  }));

  const count = employees.length;
  const statusWord = statusFilter === "A" ? "absent" : statusFilter === "P" ? "present" : "late";

  return {
    speech: count > 0
      ? `${count} employee${count !== 1 ? "s are" : " is"} ${statusWord} today.`
      : `No employees are ${statusWord} today.`,
    data: { employees, count },
    label,
    type: "employee_list",
  };
}

async function fetchAttendanceSummary(params, date) {
  try {
    const { data } = await api.get("/company_stats_daily_attendance", {
      params: { ...params, from_date: date, to_date: date, per_page: 500 },
    });

    const records = Array.isArray(data?.data) ? data.data : [];
    const summary = { present: 0, absent: 0, late: 0, leave: 0, holiday: 0, off: 0, total: records.length };

    for (const r of records) {
      const status = r.status || "";
      if (["P", "ME", "EG"].includes(status)) summary.present++;
      else if (status === "A") summary.absent++;
      else if (status === "LC") { summary.late++; summary.present++; }
      else if (status === "L") summary.leave++;
      else if (status === "H") summary.holiday++;
      else if (status === "O") summary.off++;
    }

    return {
      speech: `Today's summary: ${summary.present} present, ${summary.absent} absent, ${summary.late} late, ${summary.leave} on leave.`,
      data: summary,
      label: "Attendance Summary",
      type: "summary",
    };
  } catch {
    // Fallback: use staff-stats style count
    return {
      speech: "Could not fetch attendance summary right now.",
      data: { present: 0, absent: 0, late: 0, leave: 0, holiday: 0, off: 0, total: 0 },
      label: "Attendance Summary",
      type: "summary",
    };
  }
}

async function fetchLeaveRequests(params, approvedOnly, date) {
  const queryParams = { ...params, per_page: 100 };

  if (approvedOnly) {
    queryParams.status = 1;
    if (date) {
      queryParams.start_date = date;
      queryParams.end_date = date;
    }
  } else {
    queryParams.status = 0;
  }

  const { data } = await api.get("/employee_leaves", { params: queryParams });
  const records = Array.isArray(data?.data) ? data.data : [];

  const leaves = records.map((r) => ({
    name: r.employee?.first_name
      ? `${r.employee.first_name} ${r.employee.last_name || ""}`.trim()
      : "Unknown",
    leave_type: r.leave_type?.name || "Leave",
    start_date: r.start_date,
    end_date: r.end_date,
    days: r.total_days || 1,
    status: r.status === 1 ? "Approved" : r.status === 0 ? "Pending" : "Rejected",
  }));

  const count = leaves.length;
  const label = approvedOnly ? "On Leave Today" : "Pending Leave Requests";

  return {
    speech: approvedOnly
      ? (count > 0 ? `${count} employee${count !== 1 ? "s are" : " is"} on leave today.` : "No employees are on leave today.")
      : `There are ${count} pending leave request${count !== 1 ? "s" : ""}.`,
    data: { leaves, count },
    label,
    type: "leave_list",
  };
}

async function fetchChangeRequests(params) {
  try {
    const { data } = await api.get("/change-requests", { params: { ...params, status: "pending", per_page: 100 } });
    const records = Array.isArray(data?.data) ? data.data : [];
    const count = records.length;

    const requests = records.map((r) => ({
      name: r.employee?.first_name
        ? `${r.employee.first_name} ${r.employee.last_name || ""}`.trim()
        : "Unknown",
      date: r.date,
      reason: r.reason || "---",
    }));

    return {
      speech: `There are ${count} pending change request${count !== 1 ? "s" : ""}.`,
      data: { requests, count },
      label: "Pending Change Requests",
      type: "change_list",
    };
  } catch {
    return { speech: "Could not fetch change requests.", data: { requests: [], count: 0 }, label: "Change Requests", type: "change_list" };
  }
}

async function fetchEmployeeCount(params) {
  const { data } = await api.get("/employees_with_schedule_count", { params: { ...params, per_page: 1 } });
  const total = data?.total || 0;

  return {
    speech: `There are ${total} employees in total.`,
    data: { count: total },
    label: "Total Employees",
    type: "count",
  };
}

async function fetchUpcomingHolidays(params) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await api.get("/holidays", { params: { ...params, per_page: 50 } });
  const records = Array.isArray(data?.data) ? data.data : [];

  const upcoming = records
    .filter((h) => h.start_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 10)
    .map((h) => ({ name: h.name, date: h.start_date, days: h.total_days || 1 }));

  const count = upcoming.length;

  return {
    speech: count > 0
      ? `There are ${count} upcoming holiday${count !== 1 ? "s" : ""}. The next one is ${upcoming[0].name} on ${upcoming[0].date}.`
      : "No upcoming holidays found.",
    data: { holidays: upcoming, count },
    label: "Upcoming Holidays",
    type: "holiday_list",
  };
}
