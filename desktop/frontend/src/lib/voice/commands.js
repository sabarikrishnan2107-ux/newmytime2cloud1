/**
 * Voice command definitions.
 * Natural language triggers - the more variations, the better matching.
 */

export const NAVIGATION_COMMANDS = [
  { triggers: ["show attendance", "open attendance", "attendance page", "go to attendance", "attendance"], route: "/attendance", label: "Attendance" },
  { triggers: ["show employees", "employee list", "open employees", "go to employees", "employees", "staff list"], route: "/employees", label: "Employees" },
  { triggers: ["open schedule", "show schedule", "go to schedule", "schedule"], route: "/schedule", label: "Schedule" },
  { triggers: ["show holidays", "open holidays", "holiday list", "go to holidays", "holidays"], route: "/holiday", label: "Holidays" },
  { triggers: ["open leave", "leave dashboard", "show leave", "go to leave", "leave"], route: "/leave-dashboard", label: "Leave Dashboard" },
  { triggers: ["show reports", "open reports", "go to reports", "reports", "report"], route: "/report", label: "Reports" },
  { triggers: ["open cameras", "live camera", "show cameras", "show camera", "camera", "cameras"], route: "/live-camera", label: "Live Camera" },
  { triggers: ["open setup", "show setup", "go to setup", "setup", "settings"], route: "/setup", label: "Setup" },
  { triggers: ["show shift", "open shift", "shift page", "go to shift", "shift"], route: "/shift", label: "Shift" },
  { triggers: ["show devices", "open devices", "device list", "go to devices", "devices"], route: "/device", label: "Devices" },
  { triggers: ["open dashboard", "show dashboard", "go to dashboard", "go home", "dashboard", "home"], route: "/", label: "Dashboard" },
  { triggers: ["open branch", "show branch", "branch list", "branch"], route: "/branch/short-list", label: "Branch" },
  { triggers: ["open department", "show department", "department"], route: "/department", label: "Department" },
  { triggers: ["open payroll", "show payroll", "payroll dashboard", "payroll"], route: "/payroll", label: "Payroll" },
  { triggers: ["open visitor", "show visitor", "visitor dashboard", "visitor"], route: "/visitor", label: "Visitor" },
  { triggers: ["change request", "show change request", "open change request"], route: "/change-request", label: "Change Request" },
];

export const DATA_QUERY_COMMANDS = [
  {
    triggers: [
      "today absent list", "absent list", "who is absent", "show absent", "absent employees",
      "today absent", "absent today", "who all absent", "absent report",
      "how many absent", "absent count", "show me absent",
      "who didn't come", "who did not come", "who is not present",
    ],
    intent: "absent_list",
    label: "Today's Absent List",
  },
  {
    triggers: [
      "today present count", "present count", "how many present", "present employees",
      "today present", "present today", "who is present", "who all present",
      "present list", "show present", "present report",
    ],
    intent: "present_count",
    label: "Today's Present Count",
  },
  {
    triggers: [
      "late comers", "show late", "who is late", "late list", "late employees",
      "today late", "late today", "who came late", "late report",
      "show me late", "how many late",
    ],
    intent: "late_list",
    label: "Late Comers Today",
  },
  {
    triggers: [
      "attendance summary", "today summary", "attendance report", "today's attendance",
      "summary", "daily summary", "today report", "show summary",
      "how is attendance today", "attendance status",
    ],
    intent: "attendance_summary",
    label: "Attendance Summary",
  },
  {
    triggers: [
      "leave requests", "pending leave", "show leave requests", "leave applications",
      "pending leaves", "leave pending", "who applied leave",
    ],
    intent: "leave_requests",
    label: "Pending Leave Requests",
  },
  {
    triggers: [
      "change requests", "pending change request", "show change requests",
      "pending change", "change pending",
    ],
    intent: "change_requests",
    label: "Pending Change Requests",
  },
  {
    triggers: [
      "who is on leave", "on leave today", "leave today", "employees on leave",
      "who is on leave today", "who all on leave",
    ],
    intent: "on_leave_today",
    label: "On Leave Today",
  },
  {
    triggers: [
      "how many employees", "total employees", "employee count", "number of employees",
      "how many staff", "total staff", "staff count",
    ],
    intent: "employee_count",
    label: "Total Employees",
  },
  {
    triggers: [
      "upcoming holidays", "next holiday", "show upcoming holidays",
      "when is next holiday", "holiday coming",
    ],
    intent: "upcoming_holidays",
    label: "Upcoming Holidays",
  },
];

export const GREETING_COMMANDS = [
  {
    triggers: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"],
    response: "Hello! I'm your MyTime assistant. You can ask me things like 'show today absent list', 'how many employees', 'open attendance', or 'today summary'. What would you like to know?",
  },
  {
    triggers: ["what can you do", "help", "what are your commands", "what can i ask", "what can you help"],
    response: "I can help you with: showing absent or present employees, attendance summary, leave requests, employee count, upcoming holidays, and navigating to any page. Just ask naturally!",
  },
  {
    triggers: ["thank you", "thanks", "that's all", "ok thanks", "okay thanks"],
    response: "You're welcome! Click the mic button anytime you need help.",
  },
];
