"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Stream from "@/components/LiveCamera/Stream";

function StreamContent() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get("id");

  if (!deviceId) {
    return (
      <div className="p-10 text-slate-400">
        No device ID provided.
      </div>
    );
  }

  return (
    <div className="p-10">
      <Stream deviceId={deviceId} />
    </div>
  );
}

const StreamPage = () => {
  return (
    <Suspense fallback={<div className="p-10 text-slate-400">Loading...</div>}>
      <StreamContent />
    </Suspense>
  );
};

export default StreamPage;
