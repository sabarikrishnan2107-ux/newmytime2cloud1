// Mock data store for Leave Management module
// --- Mock Data ---

export const leaveTypes = [
  { id: "lt1", name: "Annual Leave", paid: true, carryForward: true, description: "Yearly vacation entitlement", color: "hsl(174, 62%, 40%)" },
  { id: "lt2", name: "Sick Leave", paid: true, carryForward: false, description: "Medical & health related absence", color: "hsl(0, 72%, 51%)" },
  { id: "lt3", name: "Casual Leave", paid: true, carryForward: false, description: "Short personal leave", color: "hsl(38, 92%, 50%)" },
  { id: "lt4", name: "Maternity Leave", paid: true, carryForward: false, description: "Maternity/paternity leave", color: "hsl(280, 60%, 55%)" },
  { id: "lt5", name: "Unpaid Leave", paid: false, carryForward: false, description: "Leave without pay", color: "hsl(220, 10%, 50%)" },
  { id: "lt6", name: "Compensatory Off", paid: true, carryForward: true, description: "Compensation for extra work days", color: "hsl(210, 80%, 55%)" },
];

export const leaveGroups = [
  {
    id: "lg1", name: "Standard Full-Time", description: "Default policy for full-time employees", createdAt: "2024-01-15",
    rules: [
      { id: "r1", leaveTypeId: "lt1", annualQuota: 20, accrualType: "monthly", carryForwardMax: 5, maxLimit: 25 },
      { id: "r2", leaveTypeId: "lt2", annualQuota: 12, accrualType: "monthly", carryForwardMax: 0, maxLimit: 12 },
      { id: "r3", leaveTypeId: "lt3", annualQuota: 8, accrualType: "quarterly", carryForwardMax: 0, maxLimit: 8 },
    ],
  },
  {
    id: "lg2", name: "Part-Time Policy", description: "Policy for part-time and contract employees", createdAt: "2024-02-01",
    rules: [
      { id: "r4", leaveTypeId: "lt1", annualQuota: 10, accrualType: "monthly", carryForwardMax: 2, maxLimit: 12 },
      { id: "r5", leaveTypeId: "lt2", annualQuota: 6, accrualType: "monthly", carryForwardMax: 0, maxLimit: 6 },
    ],
  },
  {
    id: "lg3", name: "Senior Management", description: "Enhanced leave for leadership team", createdAt: "2024-01-20",
    rules: [
      { id: "r6", leaveTypeId: "lt1", annualQuota: 28, accrualType: "yearly", carryForwardMax: 10, maxLimit: 38 },
      { id: "r7", leaveTypeId: "lt2", annualQuota: 15, accrualType: "monthly", carryForwardMax: 0, maxLimit: 15 },
      { id: "r8", leaveTypeId: "lt3", annualQuota: 12, accrualType: "quarterly", carryForwardMax: 0, maxLimit: 12 },
    ],
  },
];

const departments = ["Engineering", "Product", "Design", "Marketing", "Sales", "HR", "Finance"];
const categories = ["Full-Time", "Part-Time", "Contract", "Intern"];

export const employees = [
  { id: "e1", name: "Sarah Chen", email: "sarah.chen@company.com", department: "Engineering", category: "Full-Time", avatar: "SC", leaveGroupId: "lg1" },
  { id: "e2", name: "James Wilson", email: "james.wilson@company.com", department: "Product", category: "Full-Time", avatar: "JW", leaveGroupId: "lg1" },
  { id: "e3", name: "Priya Sharma", email: "priya.sharma@company.com", department: "Design", category: "Full-Time", avatar: "PS", leaveGroupId: "lg3" },
  { id: "e4", name: "Michael Brown", email: "michael.brown@company.com", department: "Marketing", category: "Part-Time", avatar: "MB", leaveGroupId: "lg2" },
  { id: "e5", name: "Emily Davis", email: "emily.davis@company.com", department: "Engineering", category: "Full-Time", avatar: "ED", leaveGroupId: "lg1" },
  { id: "e6", name: "Raj Patel", email: "raj.patel@company.com", department: "Sales", category: "Full-Time", avatar: "RP", leaveGroupId: "lg1" },
  { id: "e7", name: "Lisa Wang", email: "lisa.wang@company.com", department: "HR", category: "Full-Time", avatar: "LW", leaveGroupId: "lg3" },
  { id: "e8", name: "Tom Anderson", email: "tom.anderson@company.com", department: "Finance", category: "Contract", avatar: "TA", leaveGroupId: null },
  { id: "e9", name: "Nina Kowalski", email: "nina.kowalski@company.com", department: "Engineering", category: "Full-Time", avatar: "NK", leaveGroupId: "lg1" },
  { id: "e10", name: "David Kim", email: "david.kim@company.com", department: "Product", category: "Intern", avatar: "DK", leaveGroupId: null },
];

export const leaveRequests = [
  {
    id: "lr1", employeeId: "e1", leaveTypeId: "lt1", startDate: "2025-04-10", endDate: "2025-04-14", days: 3, reason: "Family vacation", status: "pending", appliedOn: "2025-03-25",
    alternativeEmployeeId: "e5",
    attachments: [{ name: "travel_plan.pdf", size: "245 KB", type: "pdf" }],
    approvalChain: [
      { level: 1, role: "Department Head", status: "approved", approverName: "John Director", comment: "Approved, workload covered.", actionDate: "2025-03-26" },
      { level: 2, role: "HR Manager", status: "pending" },
      { level: 3, role: "General Manager", status: "pending" },
    ],
  },
  {
    id: "lr2", employeeId: "e2", leaveTypeId: "lt2", startDate: "2025-03-28", endDate: "2025-03-28", days: 1, reason: "Doctor appointment", status: "approved", appliedOn: "2025-03-20", reviewedBy: "HR Admin", reviewedOn: "2025-03-21",
    alternativeEmployeeId: "e1",
    approvalChain: [
      { level: 1, role: "Department Head", status: "approved", approverName: "John Director", comment: "OK", actionDate: "2025-03-20" },
      { level: 2, role: "HR Manager", status: "approved", approverName: "Lisa Wang", comment: "Approved.", actionDate: "2025-03-21" },
      { level: 3, role: "General Manager", status: "approved", approverName: "CEO Office", comment: "Noted.", actionDate: "2025-03-21" },
    ],
  },
  {
    id: "lr3", employeeId: "e5", leaveTypeId: "lt1", startDate: "2025-04-21", endDate: "2025-04-25", days: 5, reason: "Travel abroad", status: "pending", appliedOn: "2025-03-24",
    alternativeEmployeeId: "e9",
    attachments: [{ name: "flight_tickets.pdf", size: "1.2 MB", type: "pdf" }, { name: "hotel_booking.jpg", size: "340 KB", type: "image" }],
    approvalChain: [
      { level: 1, role: "Department Head", status: "pending" },
      { level: 2, role: "HR Manager", status: "pending" },
      { level: 3, role: "General Manager", status: "pending" },
    ],
  },
  {
    id: "lr4", employeeId: "e6", leaveTypeId: "lt3", startDate: "2025-03-15", endDate: "2025-03-15", days: 1, reason: "Personal errand", status: "approved", appliedOn: "2025-03-10", reviewedBy: "HR Admin", reviewedOn: "2025-03-11",
    approvalChain: [
      { level: 1, role: "Department Head", status: "approved", approverName: "Sales Lead", comment: "Fine", actionDate: "2025-03-10" },
      { level: 2, role: "HR Manager", status: "approved", approverName: "Lisa Wang", actionDate: "2025-03-11" },
      { level: 3, role: "General Manager", status: "skipped" },
    ],
  },
  {
    id: "lr5", employeeId: "e3", leaveTypeId: "lt1", startDate: "2025-05-05", endDate: "2025-05-09", days: 5, reason: "Extended holiday", status: "rejected", appliedOn: "2025-03-18", reviewedBy: "HR Admin", reviewedOn: "2025-03-19",
    approvalChain: [
      { level: 1, role: "Department Head", status: "approved", approverName: "Design Lead", comment: "Can be managed", actionDate: "2025-03-18" },
      { level: 2, role: "HR Manager", status: "rejected", approverName: "Lisa Wang", comment: "Conflicts with company event. Please reschedule.", actionDate: "2025-03-19" },
      { level: 3, role: "General Manager", status: "skipped" },
    ],
  },
  {
    id: "lr6", employeeId: "e9", leaveTypeId: "lt2", startDate: "2025-03-27", endDate: "2025-03-28", days: 2, reason: "Feeling unwell", status: "pending", appliedOn: "2025-03-26",
    attachments: [{ name: "medical_cert.pdf", size: "120 KB", type: "pdf" }],
    approvalChain: [
      { level: 1, role: "Department Head", status: "approved", approverName: "John Director", comment: "Get well soon", actionDate: "2025-03-26" },
      { level: 2, role: "HR Manager", status: "approved", approverName: "Lisa Wang", actionDate: "2025-03-26" },
      { level: 3, role: "General Manager", status: "pending" },
    ],
  },
  {
    id: "lr7", employeeId: "e7", leaveTypeId: "lt3", startDate: "2025-04-01", endDate: "2025-04-01", days: 1, reason: "Home repair", status: "approved", appliedOn: "2025-03-22", reviewedBy: "HR Admin", reviewedOn: "2025-03-23",
    approvalChain: [
      { level: 1, role: "Department Head", status: "approved", approverName: "HR Lead", actionDate: "2025-03-22" },
      { level: 2, role: "HR Manager", status: "approved", approverName: "Lisa Wang", actionDate: "2025-03-23" },
      { level: 3, role: "General Manager", status: "approved", approverName: "CEO Office", actionDate: "2025-03-23" },
    ],
  },
];

export const leaveBalances = [
  { employeeId: "e1", leaveTypeId: "lt1", entitled: 20, used: 5, pending: 3, remaining: 12 },
  { employeeId: "e1", leaveTypeId: "lt2", entitled: 12, used: 2, pending: 0, remaining: 10 },
  { employeeId: "e1", leaveTypeId: "lt3", entitled: 8, used: 1, pending: 0, remaining: 7 },
  { employeeId: "e2", leaveTypeId: "lt1", entitled: 20, used: 8, pending: 0, remaining: 12 },
  { employeeId: "e2", leaveTypeId: "lt2", entitled: 12, used: 3, pending: 0, remaining: 9 },
  { employeeId: "e5", leaveTypeId: "lt1", entitled: 20, used: 3, pending: 5, remaining: 12 },
  { employeeId: "e5", leaveTypeId: "lt2", entitled: 12, used: 0, pending: 0, remaining: 12 },
  { employeeId: "e6", leaveTypeId: "lt1", entitled: 20, used: 7, pending: 0, remaining: 13 },
  { employeeId: "e6", leaveTypeId: "lt3", entitled: 8, used: 3, pending: 0, remaining: 5 },
  { employeeId: "e3", leaveTypeId: "lt1", entitled: 28, used: 10, pending: 0, remaining: 18 },
  { employeeId: "e3", leaveTypeId: "lt2", entitled: 15, used: 2, pending: 0, remaining: 13 },
  { employeeId: "e7", leaveTypeId: "lt1", entitled: 28, used: 6, pending: 0, remaining: 22 },
  { employeeId: "e7", leaveTypeId: "lt3", entitled: 12, used: 4, pending: 1, remaining: 7 },
  { employeeId: "e9", leaveTypeId: "lt1", entitled: 20, used: 4, pending: 0, remaining: 16 },
  { employeeId: "e9", leaveTypeId: "lt2", entitled: 12, used: 1, pending: 2, remaining: 9 },
];

export const leaveLedger = [
  { id: "ll1", employeeId: "e1", leaveTypeId: "lt1", date: "2025-01-01", type: "credit", amount: 20, description: "Annual entitlement credited" },
  { id: "ll2", employeeId: "e1", leaveTypeId: "lt1", date: "2025-02-10", type: "debit", amount: 3, description: "Leave taken: Feb 10-12" },
  { id: "ll3", employeeId: "e1", leaveTypeId: "lt1", date: "2025-03-05", type: "debit", amount: 2, description: "Leave taken: Mar 5-6" },
  { id: "ll4", employeeId: "e1", leaveTypeId: "lt2", date: "2025-01-01", type: "credit", amount: 12, description: "Annual entitlement credited" },
  { id: "ll5", employeeId: "e1", leaveTypeId: "lt2", date: "2025-01-20", type: "debit", amount: 1, description: "Sick leave: Jan 20" },
  { id: "ll6", employeeId: "e1", leaveTypeId: "lt2", date: "2025-03-15", type: "debit", amount: 1, description: "Sick leave: Mar 15" },
];

// Helper functions
export function getEmployee(id) { return employees.find(e => e.id === id); }
export function getLeaveType(id) { return leaveTypes.find(lt => lt.id === id); }
export function getLeaveGroup(id) { return leaveGroups.find(lg => lg.id === id); }
export function getEmployeeBalances(employeeId) { return leaveBalances.filter(b => b.employeeId === employeeId); }
export function getEmployeeRequests(employeeId) { return leaveRequests.filter(r => r.employeeId === employeeId); }
export function getEmployeeLedger(employeeId) { return leaveLedger.filter(l => l.employeeId === employeeId); }
