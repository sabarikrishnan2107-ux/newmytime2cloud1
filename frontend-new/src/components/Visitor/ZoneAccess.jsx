"use client";

import { useState } from "react";
import { Search, Plus, Edit, Trash2, X, MapPin, Shield, Users, Lock, Unlock } from "lucide-react";

const mockZones = [
  { id: 1, name: "Main Lobby", type: "public", accessLevel: "all", maxCapacity: 50, currentOccupancy: 18, devices: ["Gate A", "Gate B"], allowedTypes: ["Business", "Contractor", "Delivery", "VIP", "Interview"], requiresEscort: false, status: "active" },
  { id: 2, name: "Floor 3 - Engineering", type: "restricted", accessLevel: "business", maxCapacity: 20, currentOccupancy: 5, devices: ["Door 3A"], allowedTypes: ["Business", "VIP"], requiresEscort: true, status: "active" },
  { id: 3, name: "Executive Floor", type: "restricted", accessLevel: "vip", maxCapacity: 10, currentOccupancy: 2, devices: ["Elevator Access"], allowedTypes: ["VIP"], requiresEscort: true, status: "active" },
  { id: 4, name: "Loading Bay", type: "restricted", accessLevel: "contractor", maxCapacity: 15, currentOccupancy: 3, devices: ["Bay Gate 1", "Bay Gate 2"], allowedTypes: ["Contractor", "Delivery"], requiresEscort: false, status: "active" },
  { id: 5, name: "Server Room", type: "high-security", accessLevel: "none", maxCapacity: 5, currentOccupancy: 0, devices: ["Biometric Door SR1"], allowedTypes: [], requiresEscort: true, status: "locked" },
  { id: 6, name: "Parking Garage", type: "public", accessLevel: "all", maxCapacity: 100, currentOccupancy: 35, devices: ["Parking Barrier"], allowedTypes: ["Business", "Contractor", "VIP"], requiresEscort: false, status: "active" },
];

const typeColors = {
  public: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  restricted: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  "high-security": "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
};

export default function ZoneAccess() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  const filtered = mockZones.filter(z =>
    !search || [z.name, z.type].some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCapacity = mockZones.reduce((s, z) => s + z.maxCapacity, 0);
  const totalOccupancy = mockZones.reduce((s, z) => s + z.currentOccupancy, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Zone Access Control</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage visitor access zones, restrictions, and capacity</p>
        </div>
        <button onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">
          <Plus className="h-3.5 w-3.5" /> Add Zone
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><MapPin className="w-3.5 h-3.5 text-blue-500" /><span className="text-[10px] text-gray-500">Total Zones</span></div>
          <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{mockZones.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] text-gray-500">Current Occupancy</span></div>
          <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalOccupancy} <span className="text-xs font-normal text-gray-400">/ {totalCapacity}</span></div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><Shield className="w-3.5 h-3.5 text-amber-500" /><span className="text-[10px] text-gray-500">Restricted Zones</span></div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{mockZones.filter(z => z.type === "restricted").length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4">
          <div className="flex items-center gap-2 mb-2"><Lock className="w-3.5 h-3.5 text-red-500" /><span className="text-[10px] text-gray-500">Locked Zones</span></div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">{mockZones.filter(z => z.status === "locked").length}</div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input placeholder="Search zones..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(z => {
          const occupancyPercent = Math.round((z.currentOccupancy / z.maxCapacity) * 100);
          return (
            <div key={z.id} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-4 hover:shadow-md transition cursor-pointer" onClick={() => setSelectedZone(z)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {z.status === "locked" ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{z.name}</div>
                    <div className="text-[10px] text-gray-400">{z.devices.join(", ")}</div>
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${typeColors[z.type] || ""}`}>{z.type}</span>
              </div>
              {/* Capacity bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Occupancy</span><span>{z.currentOccupancy}/{z.maxCapacity} ({occupancyPercent}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${occupancyPercent > 80 ? "bg-red-500" : occupancyPercent > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${occupancyPercent}%` }}></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {z.allowedTypes.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">{t}</span>
                ))}
                {z.allowedTypes.length === 0 && <span className="text-[9px] text-red-400 font-medium">No visitor access</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                {z.requiresEscort && <span className="flex items-center gap-0.5"><Shield className="w-3 h-3" /> Escort required</span>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full text-center py-8 text-gray-400 text-xs">No zones found</div>}
      </div>

      {/* Add Zone Dialog */}
      {dialogOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Add Zone</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500">Zone Name</label>
                  <input type="text" placeholder="e.g. Floor 2 Office" className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500">Zone Type</label>
                  <select className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <option value="public">Public</option><option value="restricted">Restricted</option><option value="high-security">High Security</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500">Max Capacity</label>
                  <input type="number" placeholder="0" className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-gray-500">Access Devices</label>
                  <input type="text" placeholder="Gate A, Door 1" className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300" /></div>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 dark:border-white/20 text-primary focus:ring-primary" /> Requires Escort
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-lg bg-primary text-xs font-medium text-white hover:bg-blue-600 transition shadow-sm">Save Zone</button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Detail Drawer */}
      {selectedZone && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedZone(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{selectedZone.name}</h3>
              <button onClick={() => setSelectedZone(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[["Type", selectedZone.type], ["Status", selectedZone.status], ["Max Capacity", selectedZone.maxCapacity],
                ["Current Occupancy", selectedZone.currentOccupancy], ["Devices", selectedZone.devices.join(", ")],
                ["Requires Escort", selectedZone.requiresEscort ? "Yes" : "No"],
                ["Allowed Types", selectedZone.allowedTypes.join(", ") || "None"]].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span><span className="text-gray-800 dark:text-gray-200 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
