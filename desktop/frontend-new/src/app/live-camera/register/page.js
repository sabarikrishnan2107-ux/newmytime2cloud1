"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Register from "@/components/LiveCamera/Register";

function RegisterContent() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get("id");

  if (!deviceId) {
    return <div className="p-10 text-slate-400">No device ID provided.</div>;
  }

  return (
    <div className="p-10">
      <Register deviceId={deviceId} />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-10 text-slate-400">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
