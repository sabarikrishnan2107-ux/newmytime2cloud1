// ─────────────────────────────────────────────────────────────────────────────
// Scripted help content for the /support page assistant. Fully editable.
//
// Structure:
//   • faqSections — the top-level categories shown as chips (id, label, icon).
//   • faqEntries  — one Q&A per page/feature. Each entry belongs to a `section`.
//
// The assistant works two ways:
//   1. Browse — pick a section chip → pick a question chip → see the answer.
//   2. Type   — free text is matched against each entry's `keywords` (and its
//      question). A strong match answers directly; a weak match offers
//      "did you mean" suggestions; nothing matched shows `faqFallback`.
//
// To add a Q&A: copy an entry, give it a unique `id`, set its `section` (must
// match a faqSections id), question, keywords, and a step-by-step `answer`.
// Answers use "\n" for line breaks — the chat renders them as separate lines.
//
// Navigation paths below are taken from the app's menu (lib/menuData.js), so
// they match what the user actually sees. Content is in English.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  BookUser,
  Lock,
  LocateFixed,
  BarChart3,
  Settings,
  KeyRound,
} from "lucide-react";

export const faqGreeting =
  "Hi! I'm the MyTime2Cloud assistant 👋 Pick a topic below, or just type your question.";

export const faqFallback =
  "I'm not sure about that one yet. Pick a topic below, or use the contact options on the left — our support team is happy to help.";

// Top-level categories (shown as chips under the greeting).
export const faqSections = [
  { id: "employees", label: "Employees", icon: Users },
  { id: "attendance", label: "Attendance", icon: Clock },
  { id: "leave", label: "Leave", icon: CalendarDays },
  { id: "payroll", label: "Payroll", icon: DollarSign },
  { id: "visitors", label: "Visitors", icon: BookUser },
  { id: "access", label: "Access Control", icon: Lock },
  { id: "tracker", label: "Live Tracker", icon: LocateFixed },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "account", label: "Account", icon: KeyRound },
];

export const faqEntries = [
  // ── Employees ──────────────────────────────────────────────────────────────
  {
    id: "add-employee",
    section: "employees",
    question: "How do I add an employee?",
    keywords: ["add employee", "new employee", "create employee", "register employee", "add staff", "onboard"],
    answer:
      "Here's how to add an employee:\n" +
      "1. Open EMPLOYEES from the top menu.\n" +
      "2. On the Employee List, click the + New button (top right).\n" +
      "3. Fill in the details — name, branch, department, position, and join date.\n" +
      "4. Click Save. The new employee appears in your list right away.",
  },
  {
    id: "edit-employee",
    section: "employees",
    question: "How do I edit an employee?",
    keywords: ["edit employee", "update employee", "change employee", "modify employee", "employee details"],
    answer:
      "To edit an employee:\n" +
      "1. Open EMPLOYEES → Employee List.\n" +
      "2. Find the person (use the search box or Branch/Department filters).\n" +
      "3. Open their row from the Actions menu and choose Edit.\n" +
      "4. Update the details and click Save.",
  },
  {
    id: "find-employee",
    section: "employees",
    question: "How do I find or filter employees?",
    keywords: ["find employee", "search employee", "filter employee", "employee list", "branch filter", "department filter"],
    answer:
      "To find employees:\n" +
      "1. Open EMPLOYEES → Employee List.\n" +
      "2. Type a name or ID in the Search box, or\n" +
      "3. Use the Select Branch and Select Department dropdowns to narrow the list.",
  },
  {
    id: "employee-upload",
    section: "employees",
    question: "How do I bulk upload employee photos?",
    keywords: ["upload photo", "employee photo", "bulk upload", "import photos", "photo upload", "employee upload"],
    answer:
      "To upload employee photos in bulk:\n" +
      "1. Open EMPLOYEES → Employee Upload.\n" +
      "2. Select the photo files (named or matched to employee IDs).\n" +
      "3. Confirm the matches, then click Upload.",
  },
  {
    id: "sync-employee-device",
    section: "employees",
    question: "How do I transfer or upload employees to a device?",
    keywords: [
      "transfer", "transfer employee", "transfer to device", "transfer employee to device",
      "transfer details", "transfer the details",
      "upload employee", "upload employee to device", "upload to device", "upload for device",
      "send employee", "send to device", "send to the device", "send employee to device",
      "push employee", "push to device", "push to the device",
      "sync employee", "sync to device", "sync employees to device", "sync employee to device",
      "enroll employee", "enroll on device", "register employee on device", "register on device",
      "employee to device", "add employee to device", "assign employee to device",
      "details to the device", "details to device",
    ],
    answer:
      "To transfer (sync) employees to a device:\n" +
      "1. Open EMPLOYEES → Employee Upload.\n" +
      "2. Choose the branch (and device model, if shown) to load its devices.\n" +
      "3. Tick the employees you want to send, then tick the target device(s).\n" +
      "4. Click Submit. Each selected employee is pushed to each device, and a Sync Progress window shows the result per device.\n\n" +
      "Tip: the employee's face photo is sent too — upload it first on the same page or in the employee's profile. To check which devices someone is already on, open EMPLOYEES → Employee List → Actions menu → Devices.",
  },
  {
    id: "enrolled-devices",
    section: "employees",
    question: "How do I see or remove the devices an employee is on?",
    keywords: [
      "enrolled devices", "employee devices", "remove from device", "which devices",
      "delete from device", "device enrollment", "unenroll", "remove employee from device",
    ],
    answer:
      "To see (or remove) the devices an employee is enrolled on:\n" +
      "1. Open EMPLOYEES → Employee List.\n" +
      "2. Open the person's Actions menu and choose Devices.\n" +
      "3. The list shows each device and whether the employee's data, face, RFID, and PIN are present.\n" +
      "4. Use the delete icon (or tick several and click Delete Selected) to remove them from a device.",
  },
  {
    id: "document-expiry",
    section: "employees",
    question: "How do I track document expiry?",
    keywords: ["document expiry", "expiry", "expiring documents", "visa expiry", "id expiry", "passport expiry"],
    answer:
      "To track expiring documents:\n" +
      "1. Open EMPLOYEES → Document Expiry.\n" +
      "2. Review documents grouped by how soon they expire.\n" +
      "3. Open an employee to update or renew a document's expiry date.",
  },
  {
    id: "device-logs",
    section: "employees",
    question: "Where do I see device logs?",
    keywords: ["device logs", "punch logs", "device log", "raw logs", "machine logs"],
    answer:
      "To view device logs:\n" +
      "1. Open EMPLOYEES → Device Logs.\n" +
      "2. Filter by device, employee, or date.\n" +
      "3. Each row shows the raw punch captured from the device.",
  },

  // ── Attendance ───────────────────────────────────────────────────────────────
  {
    id: "attendance-view",
    section: "attendance",
    question: "How is attendance recorded?",
    keywords: ["attendance", "mark attendance", "punch", "check in", "clock in", "view attendance"],
    answer:
      "Attendance is captured automatically from your devices and synced in real time.\n\n" +
      "To review it:\n" +
      "1. Open ATTENDANCE from the top menu.\n" +
      "2. Pick the date range and the employee or branch.\n" +
      "3. Review clock-in / clock-out times and totals.",
  },
  {
    id: "schedule",
    section: "attendance",
    question: "How do I manage shifts and schedules?",
    keywords: ["schedule", "shift", "roster", "assign shift", "shift plan", "timetable"],
    answer:
      "To manage shifts and schedules:\n" +
      "1. Open ATTENDANCE → Schedule (or Shift).\n" +
      "2. Pick the branch, department, and date range.\n" +
      "3. Assign or change shifts for employees and click Save.",
  },
  {
    id: "attendance-change-request",
    section: "attendance",
    question: "How do I raise an attendance change request?",
    keywords: ["change request", "correct attendance", "fix attendance", "missing punch", "wrong punch", "regularize"],
    answer:
      "To correct an attendance entry:\n" +
      "1. Open ATTENDANCE → Change Request.\n" +
      "2. Click New, choose the employee and date.\n" +
      "3. Enter the corrected time and a reason, then Submit.\n" +
      "4. Once approved, the attendance record updates.",
  },

  // ── Leave ──────────────────────────────────────────────────────────────────
  {
    id: "leave-dashboard",
    section: "leave",
    question: "Where is the leave dashboard?",
    keywords: ["leave dashboard", "leave overview", "who is on leave", "leave summary", "leave calendar"],
    answer:
      "To open the leave dashboard:\n" +
      "1. Open LEAVE from the top menu, then click Dashboard.\n" +
      "2. See who's on leave, pending requests, and upcoming time off at a glance.",
  },
  {
    id: "approve-leave",
    section: "leave",
    question: "How do I approve a leave request?",
    keywords: ["approve leave", "leave request", "approve request", "leave approval", "accept leave", "reject leave"],
    answer:
      "To approve (or reject) a leave request:\n" +
      "1. Open LEAVE from the top menu, then click Requests.\n" +
      "2. Find the pending request in the list.\n" +
      "3. Click Approve or Reject.\n" +
      "4. Add a note if you want, then confirm. The employee is notified of your decision.",
  },
  {
    id: "leave-balances",
    section: "leave",
    question: "How do I check leave balances?",
    keywords: ["leave balance", "balances", "remaining leave", "leave days left", "entitlement"],
    answer:
      "To check leave balances:\n" +
      "1. Open LEAVE → Balances.\n" +
      "2. Pick the employee or branch.\n" +
      "3. Review used and remaining days for each leave type.",
  },
  {
    id: "leave-settings",
    section: "leave",
    question: "How do I configure leave types and settings?",
    keywords: ["leave settings", "leave type", "leave policy", "configure leave", "approval levels"],
    answer:
      "To configure leave:\n" +
      "1. Open LEAVE → Settings.\n" +
      "2. Add or edit leave types, entitlements, and approval levels.\n" +
      "3. Click Save to apply the policy.",
  },
  {
    id: "leave-reports",
    section: "leave",
    question: "Where are the leave reports?",
    keywords: ["leave report", "leave summary report", "leave history", "export leave"],
    answer:
      "To view leave reports:\n" +
      "1. Open LEAVE → Reports.\n" +
      "2. Set the filters — branch, leave type, and date range.\n" +
      "3. Review on screen or click Export to download.",
  },

  // ── Payroll ──────────────────────────────────────────────────────────────────
  {
    id: "payroll-dashboard",
    section: "payroll",
    question: "Where is the payroll dashboard?",
    keywords: ["payroll dashboard", "payroll overview", "payroll", "payslips"],
    answer:
      "To open payroll:\n" +
      "1. Open PAYROLL from the top menu.\n" +
      "2. The dashboard shows the current pay run, totals, and quick links.",
  },
  {
    id: "payroll-register",
    section: "payroll",
    question: "How do I view the payroll register?",
    keywords: ["payroll register", "register", "pay run", "monthly payroll", "process payroll"],
    answer:
      "To view the payroll register:\n" +
      "1. Open PAYROLL → Register.\n" +
      "2. Pick the month and branch.\n" +
      "3. Review each employee's earnings, deductions, and net pay.",
  },
  {
    id: "salary-structures",
    section: "payroll",
    question: "How do I set up salary structures?",
    keywords: ["salary structure", "pay structure", "earnings", "deductions", "salary components", "ctc"],
    answer:
      "To set up salary structures:\n" +
      "1. Open PAYROLL → Salary Structures.\n" +
      "2. Click New (or edit an existing one).\n" +
      "3. Add the earning and deduction components, then Save.",
  },
  {
    id: "payroll-adjustments",
    section: "payroll",
    question: "How do I add a payroll adjustment?",
    keywords: ["adjustment", "bonus", "deduction", "overtime pay", "one-time pay", "payroll adjustment"],
    answer:
      "To add a payroll adjustment:\n" +
      "1. Open PAYROLL → Adjustments.\n" +
      "2. Click New, choose the employee and pay period.\n" +
      "3. Enter the bonus or deduction amount and a note, then Save.",
  },
  {
    id: "loans-advances",
    section: "payroll",
    question: "How do I manage loans and advances?",
    keywords: ["loan", "advance", "salary advance", "loan repayment", "loans advances"],
    answer:
      "To manage loans and advances:\n" +
      "1. Open PAYROLL → Loans.\n" +
      "2. Click New, choose the employee, amount, and repayment schedule.\n" +
      "3. Save — repayments are then deducted automatically each pay run.",
  },
  {
    id: "payroll-settings",
    section: "payroll",
    question: "How do I configure payroll settings?",
    keywords: ["payroll settings", "pay cycle", "payroll configure", "tax settings"],
    answer:
      "To configure payroll:\n" +
      "1. Open PAYROLL → Settings.\n" +
      "2. Set the pay cycle, components, and rules.\n" +
      "3. Click Save.",
  },

  // ── Visitors ───────────────────────────────────────────────────────────────
  {
    id: "visitor-dashboard",
    section: "visitors",
    question: "Where is the visitor dashboard?",
    keywords: ["visitor dashboard", "visitors today", "visitor overview"],
    answer:
      "To open the visitor dashboard:\n" +
      "1. Open VISITORS from the top menu, then click Dashboard.\n" +
      "2. See today's visitors, who's checked in, and pending arrivals.",
  },
  {
    id: "visitor-checkin",
    section: "visitors",
    question: "How do I check in a visitor?",
    keywords: ["check in visitor", "visitor check in", "reception", "register visitor", "walk in visitor"],
    answer:
      "To check in a visitor:\n" +
      "1. Open VISITORS → Reception.\n" +
      "2. Click Check-in and enter the visitor's details and host.\n" +
      "3. Confirm — a badge/pass is issued and the host is notified.",
  },
  {
    id: "visitor-logs",
    section: "visitors",
    question: "Where do I see visitor logs?",
    keywords: ["visitor logs", "visitor history", "who visited", "visitor log"],
    answer:
      "To view visitor logs:\n" +
      "1. Open VISITORS → Logs.\n" +
      "2. Filter by date, host, or status to see check-in / check-out history.",
  },
  {
    id: "visitor-directory",
    section: "visitors",
    question: "What is the visitor directory?",
    keywords: ["visitor directory", "visitor list", "saved visitors", "frequent visitors"],
    answer:
      "To use the visitor directory:\n" +
      "1. Open VISITORS → Directory.\n" +
      "2. Browse or search saved visitors to speed up repeat check-ins.",
  },
  {
    id: "visitor-preregister",
    section: "visitors",
    question: "How do I pre-register a visitor?",
    keywords: ["pre-register", "pre register visitor", "invite visitor", "schedule visitor", "expected visitor"],
    answer:
      "To pre-register a visitor:\n" +
      "1. Open VISITORS → Pre-register.\n" +
      "2. Enter the visitor's details, host, and expected date/time.\n" +
      "3. Save — they're sent an invite and check in faster on arrival.",
  },
  {
    id: "visitor-blacklist",
    section: "visitors",
    question: "How do I manage the visitor blacklist?",
    keywords: ["blacklist", "block visitor", "ban visitor", "deny visitor"],
    answer:
      "To manage the blacklist:\n" +
      "1. Open VISITORS → Blacklist.\n" +
      "2. Click Add to block someone, or remove an existing entry.\n" +
      "3. Blacklisted visitors are flagged at check-in.",
  },
  {
    id: "visitor-zones",
    section: "visitors",
    question: "How do I configure visitor zone access?",
    keywords: ["zone", "zone access", "visitor zones", "area access"],
    answer:
      "To configure zone access:\n" +
      "1. Open VISITORS → Zones.\n" +
      "2. Choose which zones a visitor type may enter.\n" +
      "3. Click Save.",
  },
  {
    id: "visitor-reports",
    section: "visitors",
    question: "Where are the visitor reports?",
    keywords: ["visitor report", "visitor analytics", "export visitors"],
    answer:
      "To view visitor reports:\n" +
      "1. Open VISITORS → Reports (also under REPORTS → Visitor).\n" +
      "2. Set the date range and filters, then review or Export.",
  },
  {
    id: "visitor-settings",
    section: "visitors",
    question: "How do I change visitor settings?",
    keywords: ["visitor settings", "visitor configure", "badge settings", "check-in form"],
    answer:
      "To change visitor settings:\n" +
      "1. Open VISITORS → Settings.\n" +
      "2. Adjust the check-in form, badge, and notification options.\n" +
      "3. Click Save.",
  },

  // ── Access Control ───────────────────────────────────────────────────────────
  {
    id: "access-dashboard",
    section: "access",
    question: "Where is the access control dashboard?",
    keywords: ["access control", "access dashboard", "door access", "access overview"],
    answer:
      "To open access control:\n" +
      "1. Open ACCESS CONTROL from the top menu, then click Dashboard.\n" +
      "2. See doors, recent entries, and access status.",
  },
  {
    id: "access-logs",
    section: "access",
    question: "Where do I see access control logs?",
    keywords: ["access logs", "door logs", "entry logs", "access history"],
    answer:
      "To view access control logs:\n" +
      "1. Open ACCESS CONTROL → Logs.\n" +
      "2. Filter by door, employee, or date to see entry/exit events.",
  },

  // ── Live Tracker ───────────────────────────────────────────────────────────
  {
    id: "live-tracker",
    section: "tracker",
    question: "How do I track employees live?",
    keywords: ["live tracker", "track employee", "live location", "gps", "map", "real time location"],
    answer:
      "To track employees live:\n" +
      "1. Open LIVE TRACKER from the top menu.\n" +
      "2. The map shows the current location of tracked employees.\n" +
      "3. Click a marker to see who it is and their last update.",
  },
  {
    id: "tracker-history",
    section: "tracker",
    question: "How do I view tracker history?",
    keywords: ["tracker history", "location history", "route history", "past location"],
    answer:
      "To view tracker history:\n" +
      "1. Open LIVE TRACKER → Tracker History.\n" +
      "2. Pick the employee and date.\n" +
      "3. Replay their route for that day on the map.",
  },

  // ── Reports ──────────────────────────────────────────────────────────────────
  {
    id: "report-attendance",
    section: "reports",
    question: "Where is the attendance report?",
    keywords: ["attendance report", "monthly attendance", "absent report", "present report", "attendance summary"],
    answer:
      "To open the attendance report:\n" +
      "1. Open REPORTS from the top menu, then click Attendance.\n" +
      "2. Set branch, department, and date range.\n" +
      "3. Review on screen or click Export / PDF to download.",
  },
  {
    id: "report-access",
    section: "reports",
    question: "Where is the access control report?",
    keywords: ["access report", "access control report", "door report"],
    answer:
      "To open the access control report:\n" +
      "1. Open REPORTS → Access Control.\n" +
      "2. Set the filters and date range, then review or Export.",
  },
  {
    id: "payroll-reports",
    section: "reports",
    question: "Where are the payroll reports?",
    keywords: ["payroll report", "payslip", "salary report", "salary slip", "payroll", "salary"],
    answer:
      "To find the payroll reports:\n" +
      "1. Open REPORTS from the top menu, then click Payroll.\n" +
      "2. Set the filters — branch, department, and month.\n" +
      "3. Review the payslips and payroll register, then click Export to download.",
  },
  {
    id: "report-visitor",
    section: "reports",
    question: "Where is the visitor report?",
    keywords: ["visitor report", "visitor summary report"],
    answer:
      "To open the visitor report:\n" +
      "1. Open REPORTS → Visitor.\n" +
      "2. Set the date range and filters, then review or Export.",
  },
  {
    id: "report-manual",
    section: "reports",
    question: "What is the manual report?",
    keywords: ["manual report", "custom report", "manual logs report"],
    answer:
      "To use the manual report:\n" +
      "1. Open REPORTS → Manual.\n" +
      "2. Choose the fields and date range you need.\n" +
      "3. Generate, then Export the result.",
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  {
    id: "setup",
    section: "settings",
    question: "Where is the initial setup?",
    keywords: ["setup", "getting started", "initial setup", "configure system"],
    answer:
      "To open setup:\n" +
      "1. Open SETTINGS from the top menu, then click Setup.\n" +
      "2. Work through the setup steps to configure your organisation.",
  },
  {
    id: "company-profile",
    section: "settings",
    question: "How do I edit the company profile?",
    keywords: ["company", "company profile", "company details", "logo", "organisation"],
    answer:
      "To edit the company profile:\n" +
      "1. Open SETTINGS → Company.\n" +
      "2. Update the name, logo, and contact details.\n" +
      "3. Click Save.",
  },
  {
    id: "branches",
    section: "settings",
    question: "How do I manage branches?",
    keywords: ["branch", "branches", "add branch", "location", "site"],
    answer:
      "To manage branches:\n" +
      "1. Open SETTINGS → Branch.\n" +
      "2. Click Add to create a branch, or edit an existing one.\n" +
      "3. Enter the details and Save.",
  },
  {
    id: "departments",
    section: "settings",
    question: "How do I manage departments?",
    keywords: ["department", "departments", "add department", "team"],
    answer:
      "To manage departments:\n" +
      "1. Open SETTINGS → Department.\n" +
      "2. Click Add to create a department, or edit one.\n" +
      "3. Enter the details and Save.",
  },
  {
    id: "add-device",
    section: "settings",
    question: "How do I add a device?",
    keywords: ["add device", "new device", "register device", "device setup", "connect device"],
    answer:
      "To add a device:\n" +
      "1. Open SETTINGS from the top menu, then click Device.\n" +
      "2. Click Add and enter the device details.\n" +
      "3. Click Save. Once the device is online it starts sending logs automatically.",
  },
  {
    id: "automation",
    section: "settings",
    question: "How do I set up automation rules?",
    keywords: ["automation", "automation rules", "workflow", "auto", "triggers"],
    answer:
      "To set up automation:\n" +
      "1. Open SETTINGS → Automation.\n" +
      "2. Click New, choose a trigger and the action to run.\n" +
      "3. Save to activate the rule.",
  },
  {
    id: "roles",
    section: "settings",
    question: "How do I manage roles and permissions?",
    keywords: ["roles", "permissions", "access rights", "user role", "add role"],
    answer:
      "To manage roles and permissions:\n" +
      "1. Open SETTINGS → Roles.\n" +
      "2. Click Create (or edit a role).\n" +
      "3. Toggle the permissions for each module, then Save.",
  },
  {
    id: "live-camera",
    section: "settings",
    question: "How do I use the live camera?",
    keywords: ["live camera", "camera", "cctv", "video feed", "register camera"],
    answer:
      "To use the live camera:\n" +
      "1. Open SETTINGS → Live Camera.\n" +
      "2. Register a camera, or open an existing one to view its live feed.",
  },
  {
    id: "geo-fencing",
    section: "settings",
    question: "How do I set up geo-fencing?",
    keywords: ["geo fencing", "geofence", "location boundary", "attendance area", "gps fence"],
    answer:
      "To set up geo-fencing:\n" +
      "1. Open SETTINGS → Geo-fencing.\n" +
      "2. Draw the allowed area on the map and set its radius.\n" +
      "3. Save — attendance is then restricted to inside that area.",
  },
  {
    id: "holidays",
    section: "settings",
    question: "How do I manage holidays?",
    keywords: ["holiday", "holidays", "public holiday", "holiday calendar", "add holiday"],
    answer:
      "To manage holidays:\n" +
      "1. Open SETTINGS → Holidays.\n" +
      "2. Click Add, enter the date and name.\n" +
      "3. Save — it appears on the holiday calendar.",
  },
  {
    id: "announcements",
    section: "settings",
    question: "How do I post an announcement?",
    keywords: ["announcement", "announcements", "notice", "broadcast", "message staff"],
    answer:
      "To post an announcement:\n" +
      "1. Open SETTINGS → Announcements.\n" +
      "2. Click New, write the message and choose who sees it.\n" +
      "3. Publish — staff are notified.",
  },
  {
    id: "activity-log",
    section: "settings",
    question: "Where is the activity log?",
    keywords: ["activity", "activity log", "audit", "history", "who changed"],
    answer:
      "To view the activity log:\n" +
      "1. Open SETTINGS → Activity.\n" +
      "2. Filter by user or date to see who did what and when.",
  },
  {
    id: "emirate-id",
    section: "settings",
    question: "How do I set up Emirate ID?",
    keywords: ["emirate id", "emirates id", "id setup", "uae id"],
    answer:
      "To set up Emirate ID:\n" +
      "1. Open SETTINGS → Emirate ID.\n" +
      "2. Configure the ID reading / verification options.\n" +
      "3. Click Save.",
  },
  {
    id: "manager-login",
    section: "settings",
    question: "How does manager login work?",
    keywords: ["manager login", "login as manager", "branch login", "delegate access"],
    answer:
      "To use manager login:\n" +
      "1. Open SETTINGS → Login.\n" +
      "2. Choose the branch/manager account to sign in as.\n" +
      "3. Confirm to switch into that manager's view.",
  },

  // ── Account ──────────────────────────────────────────────────────────────────
  {
    id: "reset-password",
    section: "account",
    question: "How do I reset my password?",
    keywords: ["reset password", "reset my password", "forgot password", "change password", "password"],
    answer:
      "To reset your password:\n" +
      "1. Click your profile at the bottom of the menu.\n" +
      "2. Choose Change Password.\n" +
      "3. Enter your current password, then your new one, and Save.\n\n" +
      "Locked out? Use 'Forgot password' on the login screen, or contact support and we'll help.",
  },
];
