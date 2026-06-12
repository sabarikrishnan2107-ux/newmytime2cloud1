// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GeoFencing from "@/components/GeoFencing/Index";


const GeoFencingPage = () => {
  const router = useRouter();
  const handleGoBack = () => router.push(`/`);
  return (
    <div className="p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]">
      <GeoFencing />
    </div>
  );
};

export default GeoFencingPage;
