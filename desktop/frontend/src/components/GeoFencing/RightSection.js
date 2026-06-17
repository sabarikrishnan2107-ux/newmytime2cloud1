// app/job-sites/geofencing/page.tsx
import React, { useEffect, useState } from "react";
import Input from "../Theme/Input";
import DropDown from "../ui/DropDown";
import { notify, parseApiError } from "@/lib/utils";
import { RadiusSlider } from "./RadiusSlider";
import { getBranchesForTable } from "@/lib/api";
import { branchListGeoFencing, updateGeoFencing } from "@/lib/endpoint/geofencing";
import { getUser } from "@/config";

export default function RightSection({ radius, setRadius, setCenter, selectedLat, setSelectedLat, selectedLng, setSelectedLng }) {

    const [tab, setTab] = useState("existing");

    const [branches, setBranches] = useState([]);
    const [dropdownItems, setDropdownItems] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(null);

    const [activeBranches, setActiveBranches] = useState([]);

    const fetchDropdowns = async () => {
        const user = await getUser();
        try {
            const { data } = await getBranchesForTable();
            const activeBranches = await branchListGeoFencing(user.company_id);
            console.log(activeBranches);
            setActiveBranches(activeBranches)

            console.debug("GeoFencing: fetched branches:", data);
            setBranches(data || []);

            // prepare items for DropDown (ensure `name` exists)
            const items = (data || []).map((b) => ({
                ...b,
                id: b.id,
                name: b.name ?? b.branch_name ?? b.title ?? b.name_en ?? `Branch ${b.id}`,
            }));
            setDropdownItems(items);
        } catch (error) {
            console.error("GeoFencing: failed to fetch branches", error);
            notify("Error", parseApiError(error), "error");
        }
    };

    useEffect(() => {
        fetchDropdowns();
    }, []);

    const selectedBranch = branches.find((b) => b.id == selectedBranchId);

    // Only update lat/lng and radius when selectedBranchId changes, not when radius changes from parent
    useEffect(() => {
        if (!selectedBranch) {
            setSelectedLat(null);
            setSelectedLng(null);
            return;
        }

        const lat = Number(
            selectedBranch.lat ?? selectedBranch.latitude ?? selectedBranch.lat_dd
        );
        const lng = Number(
            selectedBranch.lon ?? selectedBranch.lng ?? selectedBranch.long ?? selectedBranch.longitude ?? selectedBranch.lon_dd
        );

        if (!isNaN(lat) && !isNaN(lng)) {
            setSelectedLat(lat);
            setSelectedLng(lng);

            // Only update radius if branch has a value
            if (selectedBranch.geofence_radius_meter) {
                setRadius(selectedBranch.geofence_radius_meter);
            }

            // update parent map center immediately if provided
            if (typeof setCenter === "function") {
                setCenter({ lat, lng });
            }
        } else {
            // clear invalid values
            setSelectedLat(null);
            setSelectedLng(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBranchId]);

    const onsubmit = async () => {
        if (!selectedBranch) {
            notify("Validation Error", "Please select a branch from the dropdown.", "warning");
            return;
        }
        if (selectedLat === null || selectedLng === null) {
            notify("Validation Error", "Selected branch does not have valid latitude and longitude.", "warning");
            return;
        }

        let payload = {
            geofence_enabled: true,
            geofence_radius_meter: radius,
            lat: selectedLat,
            lon: selectedLng,
        }

        

        await updateGeoFencing(selectedBranchId, payload);
        fetchDropdowns();
        notify("Submitted", "Geo-fence configuration has been submitted.", "success");
        setTab("existing");
    };

    const handleDelete = async (id) => {

        let payload = {
            geofence_enabled: false,
            geofence_radius_meter: radius,
        }

        await updateGeoFencing(id, payload);
        fetchDropdowns();
        notify("Submitted", "Configuration has been deleted.", "success");

    };



    return (
        <>
            {/* Header Actions */}
            <div className="p-6 border-b border-border ">
                {/* <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">
                            <span>Dashboard</span>
                            <span className="material-symbols-outlined text-[12px]">
                                chevron_right
                            </span>
                            <span className="text-primary">Job Sites</span>
                        </div> */}

                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black tracking-tight text-slate-600 dark:text-white">
                        Geo-fencing
                    </h1>
                    <button
                        className="bg-slate-100 dark:bg-slate-900 p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                        type="button"
                    >
                        <span className="material-symbols-outlined">sync</span>
                    </button>
                </div>
            </div>

            {/* Sidebar Tabs */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setTab("existing")}
                    type="button"
                    className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2
      ${tab === "existing"
                            ? "border-primary text-primary"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                >
                    Active Branches
                </button>

                <button
                    onClick={() => setTab("new")}
                    type="button"
                    className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2
      ${tab === "new"
                            ? "border-primary text-primary"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                >
                    New Branch
                </button>
            </div>

            {/* Scrollable Panel Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Branch List Section */}
                {
                    tab == "existing" &&
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                Configured Branches
                            </h3>
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {activeBranches.length || 0} TOTAL
                            </span>
                        </div>


                        {/* activeBranches for this loop */}
                        {activeBranches.map((branch, index) => (
                            <div
                                key={branch.id || index}
                                className="bg-slate-50 dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm relative overflow-hidden group"
                            >
                                {/* Decorative accent bar */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-yellow" />

                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-600 dark:text-slate-500">
                                            {branch.branch_name}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {branch.address}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                            {branch.status || 'Active'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 mt-4 gap-4">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                            Radius
                                        </span>
                                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-500">
                                            {branch.geofence_radius_meter} Meters
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                            Personnel
                                        </span>
                                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-500">
                                            {branch.employees_count || 0} Staff
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-border flex items-center justify-end gap-2">
                                    <button
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-900 rounded transition-colors text-red-500"
                                        type="button"
                                        onClick={() => handleDelete(branch.id)} // Example handler
                                    >
                                        <span className="material-symbols-outlined text-sm text-gray-600 dark:text-slate-500">
                                            delete
                                        </span>
                                    </button>
                                </div>
                            </div>
                        ))}

                    </div>
                }


                {/* Settings Form Area */}
                {
                    tab == "new" &&
                    <div className="space-y-5">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                            New Branch Properties
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">
                                    Branch Name
                                </label>


                                <DropDown
                                    placeholder={"Select Branch"}
                                    items={dropdownItems}
                                    value={selectedBranchId}
                                    onChange={setSelectedBranchId}
                                />

                                {/* Display lat/lng for debugging / visibility */}
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <Input
                                        label="Latitude"
                                        step="any"
                                        value={selectedLat ?? ""}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            if (raw === "") {
                                                setSelectedLat(null);
                                                return;
                                            }
                                            const v = Number(raw);
                                            if (isNaN(v)) {
                                                // don't update center with invalid value, but keep input empty/null
                                                setSelectedLat(null);
                                                return;
                                            }
                                            setSelectedLat(v);
                                            if (typeof setCenter === "function" && selectedLng !== null) {
                                                setCenter({ lat: v, lng: selectedLng });
                                            }
                                        }}
                                    />
                                    <Input
                                        label="Longitude"
                                        step="any"
                                        value={selectedLng ?? ""}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            if (raw === "") {
                                                setSelectedLng(null);
                                                return;
                                            }
                                            const v = Number(raw);
                                            if (isNaN(v)) {
                                                setSelectedLng(null);
                                                return;
                                            }
                                            setSelectedLng(v);
                                            if (typeof setCenter === "function" && selectedLat !== null) {
                                                setCenter({ lat: selectedLat, lng: v });
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <RadiusSlider
                                min={50}
                                max={500}
                                value={radius}
                                step={5}
                                onChange={setRadius}
                            />
                        </div>
                    </div>
                }
            </div>

            {
                tab == "new" &&

                <div className="p-6 border-t border-border  bg-slate-50 dark:bg-slate-900/20 flex flex-col gap-3">
                    <button onClick={onsubmit}
                        className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all"
                        type="button"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            save
                        </span>
                        Submit
                    </button>
                </div>

            }
        </>
    );
}