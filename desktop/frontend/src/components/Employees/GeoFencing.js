"use client";

import React, { useState, useEffect } from "react";
import { api, buildQueryParams } from "@/lib/api-client";
import { notify } from "@/lib/utils";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./GeoFenceMap"), { ssr: false });

const GeoFencing = ({ employee_id, mobile_punch }) => {
    const [loading, setLoading] = useState(true);
    const [geoEnabled, setGeoEnabled] = useState(false);
    const [geoData, setGeoData] = useState(null);
    const [locations, setLocations] = useState([]);
    const [selectedLocationId, setSelectedLocationId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const params = await buildQueryParams({});
                const { data: locs } = await api.get("/geofence-locations", { params });
                setLocations(locs || []);

                const { data } = await api.get(`/employee-geofence/${employee_id}`, { params });
                if (data && data.geo_fencing_enabled) {
                    setGeoEnabled(true);
                    setGeoData(data);
                    setSelectedLocationId(data.geofence_location_id || "");
                }
            } catch (e) {}
            setLoading(false);
        };
        if (employee_id) fetchData();
    }, [employee_id]);

    if (!mobile_punch) return null;
    if (loading) return null;

    const handleToggle = async (enabled) => {
        setGeoEnabled(enabled);
        if (!enabled) {
            // Turn off → remove custom, use branch default
            try {
                const params = await buildQueryParams({});
                await api.post(`/employee-geofence/${employee_id}`, { ...params, geo_fencing_enabled: false, latitude: null, longitude: null, radius: 200, name: null, geofence_location_id: null });
                setGeoData(null);
                setSelectedLocationId("");
            } catch (e) {}
        }
    };

    const handleAssign = async (locationId) => {
        setSelectedLocationId(locationId);
        const loc = locations.find(l => String(l.id) === String(locationId));
        if (!loc) return;

        setSaving(true);
        try {
            const params = await buildQueryParams({});
            await api.post(`/employee-geofence/${employee_id}`, {
                ...params, name: loc.name, geo_fencing_enabled: true,
                latitude: loc.latitude, longitude: loc.longitude, radius: loc.radius, geofence_location_id: loc.id,
            });
            setGeoData({ ...loc, geo_fencing_enabled: true, geofence_location_id: loc.id });
            notify("Success", `"${loc.name}" assigned`, "success");
        } catch (e) { notify("Error", "Failed", "error"); }
        finally { setSaving(false); }
    };

    return (
        <section className="glass-card bg-card-light dark:bg-card-dark border border-white/50 dark:border-slate-700/50 rounded-2xl p-6 md:p-8" id="geofencing">
            <div className="flex items-center gap-3 mb-5 border-b border-slate-200 dark:border-slate-700 pb-4">
                <span className="material-icons text-primary bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg">location_on</span>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Geo-Fencing</h3>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                        {geoEnabled ? `Custom: ${geoData?.name || "Selected"}` : "Using branch geo-fence (default)"}
                    </p>
                </div>
                <button onClick={() => handleToggle(!geoEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${geoEnabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${geoEnabled ? "translate-x-6" : ""}`} />
                </button>
            </div>

            {geoEnabled && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select Geo-Fence Location</label>
                        <select value={selectedLocationId} onChange={e => handleAssign(e.target.value)} disabled={saving}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50">
                            <option value="">-- Select Location --</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name} — {loc.latitude}, {loc.longitude} ({loc.radius}m)</option>
                            ))}
                        </select>
                        {locations.length === 0 && (
                            <p className="text-[10px] text-amber-500 mt-1">No locations created yet. Ask admin to create from Setup → Geo-Fencing.</p>
                        )}
                    </div>

                    {geoData && geoData.geo_fencing_enabled && selectedLocationId && (
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-8 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height: "180px" }}>
                                <MapComponent
                                    latitude={parseFloat(geoData.latitude) || 0}
                                    longitude={parseFloat(geoData.longitude) || 0}
                                    radius={parseInt(geoData.radius) || 200}
                                    onMapClick={() => {}}
                                />
                            </div>
                            <div className="col-span-4 flex flex-col justify-start gap-2 pl-2">
                                <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full w-fit">CUSTOM</span>
                                <div>
                                    <div className="text-[10px] text-gray-500">Latitude</div>
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{geoData.latitude}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500">Longitude</div>
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{geoData.longitude}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500">Radius</div>
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{geoData.radius}m</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default GeoFencing;
