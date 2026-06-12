// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { getVisitorLink } from "@/lib/api";

const VisitorAppLink = () => {
  const [qrlink, setQrLink] = useState(null);

  useEffect(() => {
    const fetchCompanyId = async () => {
      const link = await getVisitorLink();
      setQrLink(link);
    };
    fetchCompanyId();
  }, []);

  // Build QR image URL when link is available
  const qrImageUrl = qrlink
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
        qrlink
      )}&size=200x200`
    : null;

  return (
    <div className="w-full lg:w-72 lg:border-r lg:border-slate-200/60 lg:pr-8 flex flex-col items-center space-y-4">
      {/* Optional: show raw URL text */}
     

      {/* QR Code box */}
      <div className="w-40 h-40 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center mb-2 shadow-sm border-2 border-dashed border-indigo-200 dark:border-slate-700 overflow-hidden">
        {qrImageUrl ? (
          <img
            src={qrImageUrl}
            alt="Visitor App QR Code"
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Loading QR...</span>
        )}
      </div>
    </div>
  );
};

export default VisitorAppLink;
