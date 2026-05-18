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
} from "lucide-react";

// 1️⃣ Reusable menu groups
const attendanceMenu = [
  { href: "/shift", icon: Clock, label: "Shift" },
  { href: "/schedule", icon: CalendarDays, label: "Schedule" },
  { href: "/attendance/change_request", icon: File, label: "Change Request" },
  { href: "/leave-dashboard", icon: Calendar, label: "Leave Dashboard" },
  // { href: "/access_control_logs", icon: Lock, label: "Access Control Logs" },
];

const accessControlMenu = [
  { href: "/access_control", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/access_control_logs", icon: History, label: "Logs" },
];

const leaveMenu = [
  { href: "/leave-dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/leaves", icon: FileCheck, label: "Requests" },
  { href: "/leave-dashboard/balances", icon: Wallet, label: "Balances" },
  { href: "/settings/leave", icon: Settings, label: "Settings" },
  { href: "/leave-dashboard/reports", icon: BarChart3, label: "Reports" },
];

const reportMenu = [
  { href: "/report", icon: FileText, label: "Attendance" },
  { href: "/access-report", icon: Lock, label: "Access Control" },
  { href: "/payslips/reports", icon: DollarSign, label: "Payroll Report" },
  { href: "/visitor/reports", icon: BookUser, label: "Visitor Report" },
  { href: "/manual-report", icon: Clipboard, label: "Manual Report" },
  {
    label: "Tracking",
    icon: LocateFixed,
    children: [
      { href: "/live-tracker",     icon: LocateFixed, label: "Live Tracker" },
      { href: "/tracker-history",  icon: History,     label: "Tracker History" },
    ],
  },
];

const companyMenu = [
  { href: "/setup", icon: Settings, label: "Setup" },
  { href: "/company", icon: Building, label: "Company" },
  { href: "/branch", icon: Briefcase, label: "Branch" },
  { href: "/department-tabs", icon: Layers, label: "Department" },
  { href: "/login/manager-login", icon: LogInIcon, label: "Login" },
  { href: "/device", icon: DoorClosedIcon, label: "Device" },
  { href: "/automation", icon: Workflow, label: "Automation" },
  { href: "/roles", icon: Shield, label: "Roles" },
  { href: "/live-camera", icon: Video, label: "Live Camera" },
  { href: "/geo-fencing", icon: Map, label: "Geo Fencing" },
  { href: "/holiday", icon: CalendarDays, label: "Holidays" },
  { href: "/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/activity", icon: ActivitySquare, label: "Activity" },
  { href: "/payslips", icon: DollarSign, label: "Payroll" },
  { href: "/settings/emirate-id", icon: CreditCard, label: "Emirate ID Setup" },
];

const payrollMenu = [
  { href: "/payslips", icon: DollarSign, label: "Dashboard" },
  { href: "/payslips/register", icon: FileText, label: "Payroll Register" },
  { href: "/payslips/salary-structures", icon: Layers, label: "Salary Structures" },
  { href: "/payslips/adjustments", icon: FileText, label: "Adjustments" },
  { href: "/payslips/loans", icon: DollarSign, label: "Loans & Advances" },
  { href: "/payslips/reports", icon: FileText, label: "Reports" },
  { href: "/payslips/settings", icon: Settings, label: "Settings" },
];

const employeesMenu = [
  { href: "/employees", icon: Users, label: "Employee List" },
  { href: "/employees/employee_photo_upload", icon: Upload, label: "Employee Upload" },
  { href: "/leaves", icon: FileText, label: "Leaves Requests" },
  { href: "/document-expiry", icon: FileText, label: "Document Expiry" },
  { href: "/logs", icon: History, label: "Device Logs" },
];

const visitorMenu = [
  { href: "/visitor", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/visitor/reception", icon: BookUser, label: "Reception" },
  { href: "/visitor/logs", icon: History, label: "Visitor Logs" },
  { href: "/visitor/directory", icon: Users, label: "Directory" },
  { href: "/visitor/pre-register", icon: Calendar, label: "Pre-Register" },
  { href: "/visitor/blacklist", icon: Shield, label: "Blacklist" },
  { href: "/visitor/zones", icon: Map, label: "Zone Access" },
  { href: "/visitor/reports", icon: FileText, label: "Reports" },
  { href: "/visitor/settings", icon: Settings, label: "Settings" },
];

const dashboardMenu = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/employees", icon: Users, label: "Employees" },
  { href: "/shift", icon: FileText, label: "Attendance" },
  { href: "/report", icon: Calendar, label: "Reports" },
];

export const leftNavLinks = {
  "/": dashboardMenu,


  "/visitor": visitorMenu,
  "/visitor/check-in": visitorMenu,
  "/visitor/logs": visitorMenu,
  "/visitor/directory": visitorMenu,
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
  "/tracker-history": reportMenu,
  "/live-tracker": reportMenu,
  "/access_control": reportMenu,
  "/access_control_logs": reportMenu,
  "/access-report": reportMenu,
  "/manual-report": reportMenu,
  "/payslips": reportMenu,
  "/visitor/logs": reportMenu,
  "/visitor/reports": reportMenu,

  "/shift": attendanceMenu,
  "/schedule": attendanceMenu,
  "/change_request": attendanceMenu,
  "/leave-dashboard": leaveMenu,
  "/leave-dashboard/calendar": leaveMenu,
  "/leave-dashboard/balances": leaveMenu,
  "/leave-dashboard/reports": leaveMenu,
  // "/access_control_logs": attendanceMenu,
  "/access_control": accessControlMenu,
  "/access_control_logs": accessControlMenu,

  "/setup": companyMenu,
  "/company": companyMenu,
  "/branch": companyMenu,
  "/login/manager-login": companyMenu,
  "/department-tabs": companyMenu,
  "/device": companyMenu,
  "/live-camera": companyMenu,
  "/live-camera/stream": companyMenu,
  "/live-camera/register": companyMenu,
  "/payslips": payrollMenu,
  "/payslips/register": payrollMenu,
  "/payslips/salary-structures": payrollMenu,
  "/payslips/adjustments": payrollMenu,
  "/payslips/loans": payrollMenu,
  "/payslips/reports": payrollMenu,
  "/payslips/settings": payrollMenu,
  "/geo-fencing": companyMenu,
  "/setup/geofencing": companyMenu,
  "/live-tracker": companyMenu,
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