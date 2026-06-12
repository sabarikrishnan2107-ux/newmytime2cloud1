// menuData.js
import {
  Home,
  Users,
  Building,
  Clock,
  CalendarDays,
  FileText,
  History,
  Lock,
  Briefcase,
  Megaphone,
  ActivitySquare,
  DollarSign,
  Upload,
  Layers,
  Workflow,
  Shield,
  Group,
  Calendar,
  DoorClosedIcon,
  LogInIcon,
  Settings,
  Clipboard,
  File,
  Map,
  LocateFixed,
  LayoutDashboard,
  FolderCog,
  FileCheck,
  Wallet,
  BarChart3,
  Video,
  BookUser,
  UserX,
  AlarmClock,
  PalmtreeIcon,
  Smartphone,
  KeyRound,
  CalendarRange,
  Server,
  CreditCard,
  UserCheck,
} from "lucide-react";

// 1️⃣ Reusable menu groups
const attendanceMenu = [
  { href: "/shift", icon: Clock, label: "menu.shift" },
  { href: "/schedule", icon: CalendarDays, label: "menu.schedule" },
  { href: "/attendance/change_request", icon: File, label: "menu.changeRequest" },
  // { href: "/access_control_logs", icon: Lock, label: "Access Control Logs" },
];

const accessControlMenu = [
  { href: "/access_control", icon: LayoutDashboard, label: "menu.dashboard" },
  { href: "/access_control_logs", icon: History, label: "menu.logs" },
  { href: "/access_control/timezones", icon: Clock, label: "menu.timezones" },
  { href: "/access_control/timezone-employees", icon: UserCheck, label: "menu.timezoneEmployees" },
  { href: "/access_control/mapping-list", icon: Layers, label: "menu.mappingList" },
];

const leaveMenu = [
  { href: "/leave-dashboard", icon: LayoutDashboard, label: "menu.dashboard" },
  { href: "/leaves", icon: FileCheck, label: "menu.requests" },
  { href: "/leave-dashboard/balances", icon: Wallet, label: "menu.balances" },
  { href: "/settings/leave", icon: Settings, label: "menu.settings" },
  { href: "/leave-dashboard/reports", icon: BarChart3, label: "menu.reports" },
];

const reportMenu = [
  { href: "/report", icon: FileText, label: "menu.reports.attendance" },
  { href: "/access-report", icon: Lock, label: "menu.reports.accessControl" },
  { href: "/payslips/reports", icon: DollarSign, label: "menu.reports.payroll" },
  { href: "/visitor/reports", icon: BookUser, label: "menu.reports.visitor" },
  { href: "/manual-report", icon: Clipboard, label: "menu.reports.manual" },
  { href: "/live-tracker-report", icon: LocateFixed, label: "menu.reports.liveTracker" },
];

const trackingMenu = [
  { href: "/live-tracker",    icon: LocateFixed, label: "menu.liveTracker" },
  { href: "/tracker-history", icon: History,     label: "menu.trackerHistory" },
];

const companyMenu = [
  { href: "/setup", icon: Settings, label: "menu.setup" },
  { href: "/company", icon: Building, label: "menu.company" },
  { href: "/branch", icon: Briefcase, label: "menu.branch" },
  { href: "/department-tabs", icon: Layers, label: "menu.department" },
  { href: "/login/manager-login", icon: LogInIcon, label: "menu.login" },
  { href: "/device", icon: DoorClosedIcon, label: "menu.device" },
  { href: "/automation", icon: Workflow, label: "menu.automation" },
  { href: "/roles", icon: Shield, label: "menu.roles" },
  { href: "/live-camera", icon: Video, label: "menu.liveCamera" },
  { href: "/geo-fencing", icon: Map, label: "menu.geoFencing" },
  { href: "/holiday", icon: CalendarDays, label: "menu.holidays" },
  { href: "/announcements", icon: Megaphone, label: "menu.announcements" },
  { href: "/activity", icon: ActivitySquare, label: "menu.activity" },
  { href: "/settings/emirate-id", icon: CreditCard, label: "menu.emirateIdSetup" },
];

const payrollMenu = [
  { href: "/payslips", icon: DollarSign, label: "menu.dashboard" },
  { href: "/payslips/register", icon: FileText, label: "menu.payrollRegister" },
  { href: "/payslips/salary-structures", icon: Layers, label: "menu.salaryStructures" },
  { href: "/payslips/adjustments", icon: FileText, label: "menu.adjustments" },
  { href: "/payslips/loans", icon: DollarSign, label: "menu.loansAdvances" },
  { href: "/payslips/reports", icon: FileText, label: "menu.reports" },
  { href: "/payslips/settings", icon: Settings, label: "menu.settings" },
];

const employeesMenu = [
  { href: "/employees", icon: Users, label: "menu.employeeList" },
  { href: "/employees/employee_photo_upload", icon: Upload, label: "menu.employeeUpload" },
  { href: "/document-expiry", icon: FileText, label: "menu.documentExpiry" },
  { href: "/logs", icon: History, label: "menu.deviceLogs" },
];

const visitorMenu = [
  { href: "/visitor", icon: LayoutDashboard, label: "menu.dashboard" },
  { href: "/visitor/reception", icon: BookUser, label: "menu.reception" },
  { href: "/visitor/logs", icon: History, label: "menu.visitorLogs" },
  { href: "/visitor/directory", icon: Users, label: "menu.directory" },
  { href: "/visitor/hosts", icon: UserCheck, label: "menu.hosts" },
  { href: "/visitor/pre-register", icon: Calendar, label: "menu.preRegister" },
  { href: "/visitor/blacklist", icon: Shield, label: "menu.blacklist" },
  { href: "/visitor/zones", icon: Map, label: "menu.zoneAccess" },
  { href: "/visitor/reports", icon: FileText, label: "menu.reports" },
  { href: "/visitor/settings", icon: Settings, label: "menu.settings" },
];

const dashboardMenu = [
  { href: "/", icon: Home, label: "menu.dashboard" },
  { href: "/employees", icon: Users, label: "menu.employees" },
  { href: "/shift", icon: FileText, label: "menu.attendance" },
  { href: "/report", icon: Calendar, label: "menu.reports" },
];

export const leftNavLinks = {
  "/": dashboardMenu,


  "/visitor": visitorMenu,
  "/visitor/check-in": visitorMenu,
  "/visitor/logs": visitorMenu,
  "/visitor/directory": visitorMenu,
  "/visitor/hosts": visitorMenu,
  "/visitor/pre-register": visitorMenu,
  "/visitor/blacklist": visitorMenu,
  "/visitor/zones": visitorMenu,
  "/visitor/reports": visitorMenu,
  "/visitor/settings": visitorMenu,
  "/employees": employeesMenu,
  "/employee_photo_upload": employeesMenu,
  "/leaves": leaveMenu,
  "/document-expiry": employeesMenu,

  "/report": reportMenu,
  "/manual-logs": reportMenu,
  "/logs": reportMenu,
  "/tracker-history": trackingMenu,
  "/live-tracker": trackingMenu,
  "/access_control": reportMenu,
  "/access_control_logs": reportMenu,
  "/access-report": reportMenu,
  "/manual-report": reportMenu,
  "/live-tracker-report": reportMenu,
  // NOTE: "/visitor/reports" intentionally maps to visitorMenu (above) so the
  // Visitor Report page keeps the Visitor sidebar. Do not re-add it here.

  "/shift": attendanceMenu,
  "/schedule": attendanceMenu,
  "/attendance": attendanceMenu,
  "/change_request": attendanceMenu,
  "/leave-dashboard": leaveMenu,
  "/leave-dashboard/calendar": leaveMenu,
  "/leave-dashboard/balances": leaveMenu,
  "/leave-dashboard/reports": leaveMenu,
  // "/access_control_logs": attendanceMenu,
  "/access_control": accessControlMenu,
  "/access_control_logs": accessControlMenu,
  "/access_control/timezones": accessControlMenu,
  "/access_control/timezone-employees": accessControlMenu,
  "/access_control/mapping-list": accessControlMenu,

  "/setup": companyMenu,
  "/company": companyMenu,
  "/branch": companyMenu,
  "/login": companyMenu,
  "/department-tabs": companyMenu,
  "/device": companyMenu,
  "/automation": companyMenu,
  "/roles": companyMenu,
  "/holiday": companyMenu,
  "/announcements": companyMenu,
  "/activity": companyMenu,
  "/settings/emirate-id": companyMenu,
  "/live-camera": companyMenu,
  "/live-camera/stream": companyMenu,
  "/live-camera/register": companyMenu,
  "/payslips": payrollMenu,
  "/payslips/register": payrollMenu,
  "/payslips/salary-structures": payrollMenu,
  "/payslips/adjustments": payrollMenu,
  "/payslips/loans": payrollMenu,
  // The Payroll Report lives under the Reports section, so it keeps the report menu.
  "/payslips/reports": reportMenu,
  "/payslips/settings": payrollMenu,
  "/geo-fencing": companyMenu,
  "/setup/geofencing": companyMenu,
  "/settings/leave": leaveMenu,
};

// notificaiton top is missing
// attendac left menu add manual log entry ->change to attendan log page (done)
// in employee menu add transfer branch option
// open door option keep on access ctontrol tab
// real time for old device done


//  $deviceFunctionMap = Device::excludeMobile()
//             ->get(['device_id', 'function']) // Only fetch what you need
//             ->pluck('function', 'device_id') // Creates [ 'ID123' => 'Attendance', 'ID456' => 'Access' ]
//             ->toArray();

//  "log_type"            =>  $deviceFunctionMap[$columns[1]] ?? null