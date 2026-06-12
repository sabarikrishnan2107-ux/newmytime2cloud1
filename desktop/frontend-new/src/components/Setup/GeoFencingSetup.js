"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { notify } from "@/lib/utils";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("../Employees/GeoFenceMap"), { ssr: false });

export default function GeoFencingSetup() {
    const [locations, setLocations] = useState([]);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: "", latitude: "", longitude: "", radius: 200 });

    const fetchLocations = async () => {
        try {
            const params = await buildQueryParams({});
            const { data } = await api.get("/geofence-locations", { params });
            setLocations(data || []);
        } catch (e) {}
    };

    useEffect(() => { fetchLocations(); }, []);

    const handleMapClick = useCallback((lat, lng) => {
        setForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
    }, []);

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => { setForm(prev => ({ ...prev, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })); notify("Success", "Location captured", "success"); },
                () => notify("Error", "Location access denied", "error")
            );
        }
    };

    const handleSave = async () => {
        if (!form.name) { notify("Error", "Enter a name", "error"); return; }
        if (!form.latitude || !form.longitude) { notify("Error", "Set location on map", "error"); return; }
        setSaving(true);
        try {
            const params = await buildQueryParams({});
            if (editingId) {
                await api.put(`/geofence-locations/${editingId}`, { ...params, ...form });
            } else {
                await api.post("/geofence-locations", { ...params, ...form });
            }
            setForm({ name: "", latitude: "", longitude: "", radius: 200 });
            setEditingId(null);
            fetchLocations();
            notify("Success", editingId ? "Location updated" : "Location created", "success");
        } catch (e) { notify("Error", "Save failed", "error"); }
        finally { setSaving(false); }
    };

    const handleEdit = (loc) => {
        setEditingId(loc.id);
        setForm({ name: loc.name, latitude: String(loc.latitude), longitude: String(loc.longitude), radius: loc.radius });
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this geo-fence location?")) return;
        try {
            const params = await buildQueryParams({});
            await api.delete(`/geofence-locations/${id}`, { params });
            fetchLocations();
            notify("Success", "Deleted", "success");
        } catch (e) { notify("Error", "Delete failed", "error"); }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex overflow-hidden">
            {/* LEFT: Map */}
            <div className="flex-1 relative bg-slate-900">
                <div className="absolute inset-0">
                    <MapComponent
                        latitude={parseFloat(form.latitude) || 25.2048}
                        longitude={parseFloat(form.longitude) || 55.2708}
                        radius={parseInt(form.radius) || 200}
                        onMapClick={handleMapClick}
                    />
                </div>
                <button onClick={getCurrentLocation}
                    className="absolute bottom-4 left-4 z-[1000] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-2xl hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                    <span className="material-symbols-outlined text-sm text-primary">my_location</span>
                    Current Location
                </button>
            </div>

            {/* RIGHT: Panel */}
            <div className="w-[340px] shrink-0 border-l border-gray-200 dark:border-white/5 bg-white dark:bg-[#0b1326] flex flex-col overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Geo-Fence Locations</h2>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Create locations that employees can be assigned to</p>
                </div>

                {/* Form */}
                <div className="px-5 py-4 border-y border-gray-200 dark:border-white/5 space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1">Location Name</label>
                        <input type="text" value={form.name} placeholder="e.g. Office HQ, Site B, Warehouse"
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1">Latitude</label>
                            <input type="number" step="0.000001" value={form.latitude} placeholder="Click map"
                                onChange={e => setForm(prev => ({ ...prev, latitude: e.target.value }))}
                                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1">Longitude</label>
                            <input type="number" step="0.000001" value={form.longitude} placeholder="Click map"
                                onChange={e => setForm(prev => ({ ...prev, longitude: e.target.value }))}
                                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300" />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">Radius</label>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{form.radius}m</span>
                        </div>
                        <input type="range" min="50" max="2000" step="50" value={form.radius}
                            onChange={e => setForm(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                            className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                    </div>
                    <button disabled={saving} onClick={handleSave}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-40">
                        <span className="material-symbols-outlined text-lg">save</span>
                        {saving ? "Saving..." : editingId ? "Update Location" : "Create Location"}
                    </button>
                    {editingId && (
                        <button onClick={() => { setEditingId(null); setForm({ name: "", latitude: "", longitude: "", radius: 200 }); }}
                            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition">Cancel Edit</button>
                    )}
                </div>

                {/* Locations List */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-2">
                        Created Locations ({locations.length})
                    </div>
                    {locations.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-xs">No locations created yet</div>
                    ) : (
                        <div className="space-y-2">
                            {locations.map(loc => (
                                <div key={loc.id}
                                    onClick={() => setForm(prev => ({ ...prev, latitude: String(loc.latitude), longitude: String(loc.longitude), radius: loc.radius }))}
                                    className="rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] p-3 cursor-pointer hover:border-primary/30 transition">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                                            <span className="text-xs font-bold text-gray-800 dark:text-white">{loc.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(loc); }}
                                                className="text-[9px] text-primary hover:underline font-medium">Edit</button>
                                            <span className="text-gray-300 dark:text-slate-600">|</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(loc.id); }}
                                                className="text-[9px] text-red-500 hover:underline font-medium">Delete</button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 dark:text-slate-500 ml-6">{loc.latitude}, {loc.longitude} · {loc.radius}m</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
