"use client";

import VisitorDashboard from "@/components/Visitor/VisitorDashboard";

export default function VisitorPage() {
  return (
    <div className="p-5 overflow-y-auto max-h-[calc(100vh-64px)]">
      <VisitorDashboard />
    </div>
  );
}
