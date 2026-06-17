"use client";

import PayrollDashboard from '@/components/payroll/PayrollDashboard';

export default function PayslipsPage() {
    return (
        <div className="p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]">
            <PayrollDashboard />
        </div>
    );
}
