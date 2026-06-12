"use client";
import { Suspense } from "react";
import PayrollRegister from "@/components/payroll/PayrollRegister";
export default function Page() { return <div className="p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]"><Suspense fallback={<div className="text-slate-500 p-8">Loading...</div>}><PayrollRegister /></Suspense></div>; }
