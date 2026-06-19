"use client";

import VisitorDirectory from "@/components/Visitor/VisitorDirectory";

export default function DirectoryPage() {
  return (
    <div className="p-5 overflow-y-auto max-h-[calc(100vh-64px)]">
      <VisitorDirectory />
    </div>
  );
}
