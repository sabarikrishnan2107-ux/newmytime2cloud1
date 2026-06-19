"use client";

import { useEffect, useState } from "react";
import CreateLeave from "@/components/LeaveRequest/Create";
import { useRouter } from "next/navigation";
import { getStaffUser } from "@/lib/staff-user";

export default function StaffLeaveApplyPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const u = await getStaffUser();
      setEmployeeId(u.employee_id);
    };
    init();
  }, []);

  const goBack = () => router.push("/staff/leave");

  if (!employeeId) return <div className="p-8 text-slate-400 text-sm">Loading...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <CreateLeave
          onSuccess={goBack}
          setOpen={(val) => { if (!val) goBack(); }}
          staffEmployeeId={employeeId}
        />
      </div>
    </div>
  );
}
