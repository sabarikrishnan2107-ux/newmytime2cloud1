"use client";


import React, { useState } from 'react';

import { createBranch } from '@/lib/api';
import { notify, parseApiError } from '@/lib/utils';
import Input from '../Theme/Input';
import SearchableSelect from '../ui/SearchableSelect';
import MapPicker from '../ui/MapPicker';
import COUNTRIES from '@/lib/countries';
import { api } from '@/lib/api-client';

let initialPayload = {
    branch_name: "",
    branch_code: "",
    lat: "",
    lon: "",
    area: "",
    city: "",
    country: "",
    timezone: "",
    user_id: 0,
};

export default function Create({ setOpen = () => { }, onSuccess = () => { } }) {

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(initialPayload);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let { data } = await createBranch(form);

            if (data?.status == false) {

                if (data.errors) {
                    const firstKey = Object.keys(data.errors)[0]; // get the first key
                    notify("Error", data.errors[firstKey][0], "error");
                    return;
                } else {
                    notify("Error", data.message, "error");
                    return;
                }

            }

            await notify("Success", "Branch Created Successfully", "success");

            setForm(initialPayload);
            onSuccess();
        } catch (error) {
            notify("Error", parseApiError(error), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {true && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4"
                >
                    {/* Backdrop/Overlay */}
                    <div
                        className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
                    ></div>

                    {/* Modal Card */}
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">Add Branch</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Create a new branch in the system
                                </p>
                            </div>
                            <button onClick={() => setOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Form Content */}
                        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-6 space-y-5 bg-white/50 dark:bg-gray-900 overflow-y-auto flex-1">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-400">
                                        Branch Name <span className="text-red-400">*</span>
                                    </label>
                                    <Input
                                        value={form.branch_name}
                                        onChange={(e) => handleChange("branch_name", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-400">
                                        Branch Code <span className="text-red-400">*</span>
                                    </label>
                                    <Input
                                        value={form.branch_code}
                                        onChange={(e) => handleChange("branch_code", e.target.value)}
                                    />
                                </div>

                                {/* Map Picker */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-400">
                                        Location <span className="text-red-400">*</span>
                                    </label>
                                    <MapPicker
                                        lat={form.lat}
                                        lon={form.lon}
                                        onChange={async (lat, lon) => {
                                            handleChange("lat", lat);
                                            handleChange("lon", lon);
                                            try {
                                                const { data } = await api.get("/reverse-geocode-country", { params: { lat, lon } });
                                                if (data?.country_code) {
                                                    handleChange("country", data.country_code);
                                                }
                                            } catch {}
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Lat <span className="text-red-400">*</span>
                                        </label>
                                        <Input
                                            value={form.lat}
                                            onChange={(e) => handleChange("lat", e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Lon <span className="text-red-400">*</span>
                                        </label>
                                        <Input
                                            value={form.lon}
                                            onChange={(e) => handleChange("lon", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Area
                                        </label>
                                        <Input
                                            value={form.area}
                                            onChange={(e) => handleChange("area", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            City
                                        </label>
                                        <Input
                                            value={form.city}
                                            onChange={(e) => handleChange("city", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Country
                                        </label>
                                        <SearchableSelect
                                            value={form.country}
                                            onChange={(val) => handleChange("country", val)}
                                            options={COUNTRIES}
                                            placeholder="Search country..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Timezone
                                        </label>
                                        <select
                                            value={form.timezone}
                                            onChange={(e) => handleChange("timezone", e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                        >
                                            <option value="">Select Timezone</option>
                                            <option value="GMT-12:00">(GMT-12:00) Baker Island</option>
                                            <option value="GMT-11:00">(GMT-11:00) Pago Pago</option>
                                            <option value="GMT-10:00">(GMT-10:00) Hawaii</option>
                                            <option value="GMT-09:00">(GMT-09:00) Alaska</option>
                                            <option value="GMT-08:00">(GMT-08:00) Pacific Time</option>
                                            <option value="GMT-07:00">(GMT-07:00) Mountain Time</option>
                                            <option value="GMT-06:00">(GMT-06:00) Central Time</option>
                                            <option value="GMT-05:00">(GMT-05:00) Eastern Time</option>
                                            <option value="GMT-04:00">(GMT-04:00) Atlantic Time</option>
                                            <option value="GMT-03:30">(GMT-03:30) Newfoundland</option>
                                            <option value="GMT-03:00">(GMT-03:00) Buenos Aires</option>
                                            <option value="GMT-02:00">(GMT-02:00) Mid-Atlantic</option>
                                            <option value="GMT-01:00">(GMT-01:00) Azores</option>
                                            <option value="GMT+00:00">(GMT+00:00) London, Dublin</option>
                                            <option value="GMT+01:00">(GMT+01:00) Paris, Berlin</option>
                                            <option value="GMT+02:00">(GMT+02:00) Cairo, Johannesburg</option>
                                            <option value="GMT+03:00">(GMT+03:00) Moscow, Riyadh</option>
                                            <option value="GMT+03:30">(GMT+03:30) Tehran</option>
                                            <option value="GMT+04:00">(GMT+04:00) Dubai, Abu Dhabi</option>
                                            <option value="GMT+04:30">(GMT+04:30) Kabul</option>
                                            <option value="GMT+05:00">(GMT+05:00) Karachi, Tashkent</option>
                                            <option value="GMT+05:30">(GMT+05:30) India, Sri Lanka</option>
                                            <option value="GMT+05:45">(GMT+05:45) Kathmandu</option>
                                            <option value="GMT+06:00">(GMT+06:00) Dhaka, Almaty</option>
                                            <option value="GMT+06:30">(GMT+06:30) Yangon</option>
                                            <option value="GMT+07:00">(GMT+07:00) Bangkok, Jakarta</option>
                                            <option value="GMT+08:00">(GMT+08:00) Singapore, Hong Kong</option>
                                            <option value="GMT+09:00">(GMT+09:00) Tokyo, Seoul</option>
                                            <option value="GMT+09:30">(GMT+09:30) Adelaide</option>
                                            <option value="GMT+10:00">(GMT+10:00) Sydney, Melbourne</option>
                                            <option value="GMT+11:00">(GMT+11:00) Solomon Islands</option>
                                            <option value="GMT+12:00">(GMT+12:00) Auckland, Fiji</option>
                                            <option value="GMT+13:00">(GMT+13:00) Tonga</option>
                                        </select>
                                    </div>
                                </div>

                            </div>

                            {/* Action Buttons */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10  flex justify-end gap-3 flex-shrink-0">
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-all text-sm font-bold shadow-lg shadow-primary/20"
                                >
                                    {loading ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )


}
