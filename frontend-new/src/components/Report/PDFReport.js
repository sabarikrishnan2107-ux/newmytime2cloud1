'use client';

import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';

// --- DATA & SUB-COMPONENTS (Keep these outside for clean code) ---
const attendanceData = [
  { name: "John Doe", dept: "Logistics", shift: "Morning (06:00-14:00)", checkIn: "06:12", checkOut: "14:05", late: 12, status: "Late" },
  { name: "Alice Smith", dept: "Marketing", shift: "Afternoon (14:00-22:00)", checkIn: "13:55", checkOut: "22:10", late: "-", status: "Present" },
  { name: "Robert Johnson", dept: "Sales", shift: "Night (22:00-06:00)", checkIn: "21:58", checkOut: "06:02", late: "-", status: "Present" },
  { name: "Emily Davis", dept: "HR", shift: "Rotating A (08:00-16:00)", checkIn: "-", checkOut: "-", late: "-", status: "Absent" },
  { name: "Michael Brown", dept: "Logistics", shift: "Rotating B (16:00-00:00)", checkIn: "15:50", checkOut: "00:15", late: "-", status: "Present" },
  { name: "Jessica Wilson", dept: "Marketing", shift: "Split (09:00-13:00 / 17:00-21:00)", checkIn: "09:02", checkOut: "21:01", late: 2, status: "Present" },
  { name: "David Martinez", dept: "Sales", shift: "Weekend (10:00-19:00)", checkIn: "10:45", checkOut: "19:30", late: 45, status: "Late (Severe)" },
];

const StatusBadge = ({ status }) => {
  const baseStyles = "px-2.5 py-1 text-[10px] font-bold uppercase rounded inline-block text-center leading-tight";
  switch (status) {
    case 'Present': return <span className={`${baseStyles} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400`}>Present</span>;
    case 'Late': return <span className={`${baseStyles} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400`}>Late</span>;
    case 'Absent': return <span className={`${baseStyles} bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400`}>Absent</span>;
    case 'Late (Severe)': return <div className={`${baseStyles} bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400`}>Late<br />(Severe)</div>;
    default: return null;
  }
};

const StatCard = ({ label, value, color }) => {
  const colors = {
    gray: "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white",
    emerald: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-500",
    amber: "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/50 text-amber-700 dark:text-amber-500",
    rose: "bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/50 text-rose-700 dark:text-rose-500"
  };
  return (
    <div className={`${colors[color]} p-4 rounded-xl border`}>
      <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function AttendanceDailyDialog({isOpen, setIsOpen}) {
  const contentRef = useRef(null);

  const handleSaveAsPdf = async () => {
    try {
      if (!contentRef.current) {
        console.error('Modal content not found');
        return;
      }
      
      // Clone the element to avoid modifying the DOM
      const clonedElement = contentRef.current.cloneNode(true);
      
      // Remove all inline styles that might contain LAB colors
      const stripProblematicStyles = (node) => {
        if (node instanceof HTMLElement) {
          // Remove style attribute
          node.removeAttribute('style');
          
          // Remove dark mode and problematic classes
          const classList = Array.from(node.classList);
          classList.forEach(cls => {
            if (cls.includes('dark:') || cls.includes('darks:') || cls.includes('animate-')) {
              node.classList.remove(cls);
            }
          });
        }
        
        if (node.childNodes) {
          node.childNodes.forEach(child => stripProblematicStyles(child));
        }
      };
      
      stripProblematicStyles(clonedElement);
      
      // Create a temporary container with white background
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.backgroundColor = 'white';
      clonedElement.style.backgroundColor = 'white';
      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);
      
      // Dynamic import to avoid SSR issues
      const html2pdfLib = (await import('html2pdf.js')).default;
      const opt = {
        margin: 10,
        filename: `Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          logging: false, 
          backgroundColor: '#ffffff',
          allowTaint: true,
          useCORS: true
        },
        jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
      };
      
      await html2pdfLib().set(opt).from(clonedElement).save();
      console.log('PDF saved successfully');
      
      // Clean up temporary container
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Check console for details.');
    }
  };

  return (
    <div className="p-10">
      {/* Trigger Button */}
    

      {/* Dialog Overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-900 w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col animate-in fade-in zoom-in duration-200" ref={contentRef}>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">System Report / Attendance</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable Area) */}
            <div className="overflow-y-auto p-8 pt-4">
              <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-blue-600 tracking-tight uppercase">V PERFUMES</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Human Resources Department</p>
                </div>
                <div className="md:text-right">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Daily Attendance Report</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date: <span className="font-bold text-gray-900 dark:text-white">Oct 25, 2023</span></p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Headcount" value="324" color="gray" />
                <StatCard label="Present" value="298" color="emerald" />
                <StatCard label="Late" value="18" color="amber" />
                <StatCard label="Absent" value="8" color="rose" />
              </div>

              {/* Critical Alert Section */}
              <div className="mb-8 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-xl p-4">
                 <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase mb-3 flex items-center gap-2">
                   ⚠️ Critical Exceptions
                 </h4>
                 <div className="space-y-2">
                   <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30 flex justify-between items-center text-xs">
                     <span><strong>James Miller</strong> • Night Shift</span>
                     <span className="text-rose-600 font-bold uppercase">Absent No Leave</span>
                   </div>
                 </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-xl">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 uppercase text-[10px] font-bold tracking-widest sticky top-0">
                    <tr>
                      <th className="px-6 py-4">Employee Name</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Check-In</th>
                      <th className="px-6 py-4">Late (m)</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {attendanceData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{row.name}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{row.dept}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{row.checkIn}</td>
                        <td className={`px-6 py-4 font-bold ${row.status.includes('Late') ? 'text-amber-600' : 'text-gray-300'}`}>{row.late}</td>
                        <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                Confidential Report • {new Date().toLocaleDateString()}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={handleSaveAsPdf}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  💾 Save as PDF
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs font-bold rounded-lg"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}