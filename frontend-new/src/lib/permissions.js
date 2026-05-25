export const PERMISSION_TYPES = [
    { key: 'access', label: 'Access' },
    { key: 'view', label: 'View' },
    { key: 'create', label: 'Create' },
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
];

export const modules = [
    { id: 'dashboard', title: 'Dashboard', desc: 'Real-time overview of key metrics and stats.', icon: 'dashboard', color: 'indigo' },
    { id: 'employees', title: 'Employees', desc: 'Manage staff records, profiles, and roles.', icon: 'person', color: 'blue' },
    { id: 'attendance', title: 'Attendance', desc: 'Track daily clock-ins, shifts, and leave requests.', icon: 'schedule', color: 'emerald' },
    { id: 'payroll', title: 'Payroll', desc: 'Process salaries, bonuses, and tax deductions.', icon: 'payments', color: 'amber' },
    { id: 'report', title: 'Reports', desc: 'Generate insightful data exports and summaries.', icon: 'assessment', color: 'cyan' },
    { id: 'settings', title: 'Settings', desc: 'Configure system preferences and permissions.', icon: 'admin_panel_settings', color: 'rose' },
    { id: 'leave', title: 'Leave', desc: 'Leave requests, approvals, and balances.', icon: 'event_available', color: 'violet' },
    { id: 'live_tracker', title: 'Live Tracker', desc: 'Real-time location tracking and history.', icon: 'my_location', color: 'teal' },
    { id: 'access_control', title: 'Access Control', desc: 'Doors, devices, and access time slots.', icon: 'meeting_room', color: 'orange' },
    { id: 'visitors', title: 'Visitors', desc: 'Visitor check-in, logs, and management.', icon: 'badge', color: 'pink' },
];

export const active_module = {
    dashboard: true,
    employees: true,
    attendance: true,
    payroll: true,
    report: true,
    settings: true,
    leave: true,
    live_tracker: true,
    access_control: true,
    visitors: true,
}

export const card_content = {
    dashboard: {
        title: "Dashboard",
        desc: "Dashboard overview and quick insights",
        sub_modules: [
            {
                id: "dashboard",
                title: "Dashboard",
                desc: "Dashboard",
                icon: "dashboard",
            },
        ],
    },

    employees: {
        title: "Employees",
        desc: "Manage employee information and activities",
        sub_modules: [
            {
                id: "employees",
                title: "Employee List",
                desc: "Personal profiles & contact info",
                icon: "people_outline",
            },
            {
                id: "employees/employee_photo_upload",
                title: "Employee Upload",
                desc: "Upload employee photos",
                icon: "upload",
            },
            {
                id: "leaves",
                title: "Leaves Requests",
                desc: "Leave requests and approvals",
                icon: "file_text",
            },
            {
                id: "document-expiry",
                title: "Document Expiry",
                desc: "Document expiry management",
                icon: "file_text",
            },
        ],
    },

    attendance: {
        title: "Attendance",
        desc: "Track and manage employee attendance",
        sub_modules: [
            {
                id: "shift",
                title: "Shift",
                desc: "Shift management",
                icon: "clock",
            },
            {
                id: "schedule",
                title: "Schedule",
                desc: "Schedule management",
                icon: "calendar_days",
            },
            {
                id: "attendance/change_request",
                title: "Change Request",
                desc: "Attendance change requests",
                icon: "file",
            },
        ],
    },

    payroll: {
        title: "Payroll",
        desc: "Salary processing and payroll management",
        sub_modules: [
            {
                id: "payslips",
                title: "Payroll",
                desc: "Employee payslips",
                icon: "dollar_sign",
            },
        ],
    },

    report: {
        title: "Reports",
        desc: "Company-wide analytics and reports",
        sub_modules: [
            {
                id: "report",
                title: "Reports",
                desc: "Attendance reports",
                icon: "file_text",
            },
            {
                id: "logs",
                title: "Device Logs",
                desc: "Device logs",
                icon: "history",
            },
        ],
    },

    settings: {
        title: "Settings",
        desc: "Application and system configurations",
        sub_modules: [
            {
                id: "setup",
                title: "Setup",
                desc: "Company setup",
                icon: "settings",
            },
            {
                id: "geo-fencing",
                title: "Geo Fencing",
                desc: "Geo fencing management",
                icon: "map",
            },
            {
                id: "live-tracker",
                title: "Live Tracker",
                desc: "Live tracking",
                icon: "locate_fixed",
            },
            {
                id: "company",
                title: "Company",
                desc: "Company info",
                icon: "building",
            },
            {
                id: "branch",
                title: "Branch",
                desc: "Branch management",
                icon: "briefcase",
            },
            {
                id: "department-tabs",
                title: "Department",
                desc: "Department management",
                icon: "layers",
            },
            {
                id: "login/manager-login",
                title: "Login",
                desc: "Manager login",
                icon: "log_in_icon",
            },
            {
                id: "device",
                title: "Device",
                desc: "Device management",
                icon: "door_closed_icon",
            },
            {
                id: "automation",
                title: "Automation",
                desc: "Automation management",
                icon: "workflow",
            },
            {
                id: "roles",
                title: "Roles",
                desc: "Role management",
                icon: "shield",
            },
            {
                id: "holiday",
                title: "Holidays",
                desc: "Holiday management",
                icon: "calendar_days",
            },
            {
                id: "announcements",
                title: "Announcements",
                desc: "Announcements",
                icon: "megaphone",
            },
            {
                id: "activity",
                title: "Activity",
                desc: "Activity tracking",
                icon: "activity_square",
            },
            {
                id: "payslips",
                title: "Payroll",
                desc: "Payroll management",
                icon: "dollar_sign",
            },
        ],
    },

    leave: {
        title: "Leave",
        desc: "Leave requests, approvals, and balances",
        sub_modules: [
            { id: "leave-dashboard", title: "Leave Dashboard", desc: "Leave overview", icon: "event_available" },
            { id: "leave", title: "Leave Requests", desc: "Requests & approvals", icon: "file_text" },
        ],
    },

    live_tracker: {
        title: "Live Tracker",
        desc: "Real-time tracking and history",
        sub_modules: [
            { id: "live-tracker", title: "Live Tracker", desc: "Live map", icon: "locate_fixed" },
            { id: "tracker-history", title: "Tracker History", desc: "Location history", icon: "history" },
        ],
    },

    access_control: {
        title: "Access Control",
        desc: "Doors, devices, and access slots",
        sub_modules: [
            { id: "access_control", title: "Access Control", desc: "Doors & devices", icon: "meeting_room" },
        ],
    },

    visitors: {
        title: "Visitors",
        desc: "Visitor check-in and management",
        sub_modules: [
            { id: "visitor", title: "Visitors", desc: "Visitor list & check-in", icon: "badge" },
        ],
    },
};
