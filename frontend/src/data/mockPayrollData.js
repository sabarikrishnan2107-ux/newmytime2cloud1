export const mockPayrollEmployees = [
  { id: 1, name: "Francis Gill", department: "Admin", grossEarned: 12000, totalDeduction: 1800, netSalary: 10200, otAmount: 500, status: "approved" },
  { id: 2, name: "Aathi Balaji", department: "IT", grossEarned: 8500, totalDeduction: 1200, netSalary: 7300, otAmount: 300, status: "paid" },
  { id: 3, name: "Sowmi Saravan", department: "Tech", grossEarned: 9000, totalDeduction: 1350, netSalary: 7650, otAmount: 200, status: "pending" },
  { id: 4, name: "Nijam Deen", department: "IT", grossEarned: 11000, totalDeduction: 1650, netSalary: 9350, otAmount: 450, status: "approved" },
  { id: 5, name: "Hanifa M", department: "IT", grossEarned: 7500, totalDeduction: 1125, netSalary: 6375, otAmount: 150, status: "paid" },
  { id: 6, name: "Syed G", department: "Admin", grossEarned: 10000, totalDeduction: 1500, netSalary: 8500, otAmount: 350, status: "pending" },
  { id: 7, name: "Akash S", department: "Digital", grossEarned: 8000, totalDeduction: 1200, netSalary: 6800, otAmount: 200, status: "approved" },
  { id: 8, name: "Sabari R", department: "Tech", grossEarned: 9500, totalDeduction: 1425, netSalary: 8075, otAmount: 400, status: "paid" },
];

export const mockBatches = [
  { id: 1, month: "April 2026", company: "Demo Company", totalEmployees: 28, totalGross: 75500, totalDeductions: 11250, totalNet: 64250, status: "Draft" },
  { id: 2, month: "March 2026", company: "Demo Company", totalEmployees: 28, totalGross: 74200, totalDeductions: 11130, totalNet: 63070, status: "Paid" },
  { id: 3, month: "February 2026", company: "Demo Company", totalEmployees: 27, totalGross: 72800, totalDeductions: 10920, totalNet: 61880, status: "Paid" },
  { id: 4, month: "January 2026", company: "Demo Company", totalEmployees: 27, totalGross: 71500, totalDeductions: 10725, totalNet: 60775, status: "Paid" },
];

export const monthlyPayrollTrend = [
  { month: "Oct", gross: 68000, net: 57800, deductions: 10200 },
  { month: "Nov", gross: 70500, net: 59925, deductions: 10575 },
  { month: "Dec", gross: 72000, net: 61200, deductions: 10800 },
  { month: "Jan", gross: 71500, net: 60775, deductions: 10725 },
  { month: "Feb", gross: 72800, net: 61880, deductions: 10920 },
  { month: "Mar", gross: 74200, net: 63070, deductions: 11130 },
];

export const departmentSalaryCost = [
  { department: "Admin", cost: 22000 },
  { department: "IT", cost: 27000 },
  { department: "Tech", cost: 18500 },
  { department: "Digital", cost: 8000 },
];
