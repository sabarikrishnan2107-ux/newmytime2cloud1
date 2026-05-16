// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    getBranches,
    createDevice,
    updateDevice,
    getDeviceSettginsFromSDK,
    updateDeviceSettings,
    getDeviceCamviiSettingsFromSDK,
    updateDeviceCamviiSettings,
} from "@/lib/api";
import { notify, parseApiError } from "@/lib/utils";
import Input from "../Theme/Input";
import TextArea from "../Theme/TextArea";
import DropDown from "../ui/DropDown";
import timezones from "@/lib/timezones";
import {
    DEVICE_ENABLE_DISABLE,
    DEVICE_TYPES,
    DEVICE_VOLUME,
    FUNCTIONS,
    LANGUAGE_FOR_DEVICE,
    MODEL_NUMBERS,
    STATUSSES,
    VERIFICATION_MODE,
    RECOGNITION_MODE,
    OPEN_DURATION,
} from "@/lib/dropdowns";
import { Pencil } from "lucide-react";

const CAMVII_MODELS = ["OX-900", "MYTIME1"];

const defaultLegacyPayload = {
    device_id: "",
    language: "",
    volume: "",
    menuPassword: "",
    msgPush: "",
    time: "",
    maker_manufacturer: "",
    maker_webAddr: "",
    maker_deliveryDate: "",
};

const defaultCamviiPayload = {
    device_id: "",
    model_spec: "",
    voice_volume: "",
    local_time: "",
    wifi_ip: "",
    lan_ip: "",
    ipaddr: "",
    open_duration: "",
    verification_mode: "",
    recognition_mode: "",
    persons_count: "",
    door_open_stat: "",
};

const DeviceSettings = ({ device, device_id, open, setOpen, onSuccess = () => { } }) => {
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    const isCamvii = CAMVII_MODELS.includes(device?.model_number);
    const defaultPayload = isCamvii ? defaultCamviiPayload : defaultLegacyPayload;

    const [form, setForm] = useState(defaultPayload);

    useEffect(() => {
        setDeviceInfo(device);
    }, [device]);

    const toggleModal = () => setOpen(!open);

    const fetchBranches = async () => {
        try {
            setBranches(await getBranches());
        } catch (error) {
            console.error("Failed to fetch branches", error);
        }
    };

    const callDeviceSettings = useCallback(async (targetId) => {
        const idToQuery = targetId || device_id;
        if (!idToQuery) return;

        try {
            setLoading(true);
            setStatusMessage("");

            if (isCamvii) {
                const result = await getDeviceCamviiSettingsFromSDK({ device_id: idToQuery });
                const data = result?.SDKresponseData?.data;
                const populated = data && (data.model_spec || data.voice_volume !== "" || data.local_time);

                if (result?.status && populated) {
                    setIsSuccess(true);
                    setStatusMessage("Successful");
                    setForm((prev) => ({ ...prev, ...data, device_id: idToQuery }));
                } else {
                    setIsSuccess(false);
                    setStatusMessage("offline or not connected to this server");
                    setForm({ ...defaultCamviiPayload, device_id: idToQuery });
                }
            } else {
                const result = await getDeviceSettginsFromSDK({ device_id: idToQuery });
                const sdk = result?.SDKresponseData;
                const data = sdk?.data;
                // Device is truly online only when message says Successful AND real data came back.
                const populated = data && Object.values(data).some((v) => v !== "" && v !== null && v !== undefined);
                const successful = sdk?.message === "Successful" && populated;

                setIsSuccess(successful);
                setStatusMessage(successful ? "Successful" : "offline or not connected to this server");

                if (populated) {
                    setForm((prev) => ({ ...prev, ...data, device_id: idToQuery }));
                } else {
                    setForm({ ...defaultLegacyPayload, device_id: idToQuery });
                }
            }
        } catch (error) {
            setIsSuccess(false);
            setStatusMessage("offline or not connected to this server");
            notify("Error", parseApiError(error), "error");
        } finally {
            setLoading(false);
        }
    }, [device_id, isCamvii]);

    useEffect(() => {
        if (open && device_id) {
            fetchBranches();
            setForm({ ...defaultPayload, device_id: device_id });
            setStatusMessage("");
            setIsSuccess(false);
            callDeviceSettings(device_id);
        }
    }, [open, device_id, callDeviceSettings]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const onReload = () => {
        callDeviceSettings();
    };

    const updateSettings = async () => {
        if (isCamvii) {
            if (!confirm("Are you want to Update Device settings?")) return;

            try {
                setLoading(true);
                const response = await updateDeviceCamviiSettings({ deviceSettings: form });

                if (response?.status) {
                    notify("Success", response.message || "Device settings updated successfully", "success");
                    setTimeout(() => {
                        onSuccess();
                        setOpen(false);
                    }, 1500);
                } else {
                    notify("Error", "Try again. " + (response?.message || "No connection available"), "error");
                }
            } catch (error) {
                console.error(error);
                notify("Error", "An unexpected error occurred", "error");
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!form.menuPassword) {
            notify("Validation Error", "Device Menu password is required", "error");
            return;
        }
        if (!confirm("Are you want to Update Device settings?")) return;

        try {
            setLoading(true);
            const response = await updateDeviceSettings({ deviceSettings: form });

            if (response?.status) {
                notify("Success", response.message || "Device settings updated successfully", "success");
                setTimeout(() => {
                    onSuccess();
                    setOpen(false);
                }, 1500);
            } else {
                const errorMsg = response?.message === "undefined"
                    ? "Try again. No connection available"
                    : "Try again. " + (response?.message || "");
                notify("Error", errorMsg, "error");
            }
        } catch (error) {
            console.error(error);
            notify("Error", "An unexpected error occurred", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const title = isCamvii ? `Device - ${device?.model_number || "OXSAI"} Settings` : "Device Settings";

    return (
        <>
            {open && (
                <div
                    aria-modal="true"
                    role="dialog"
                    className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center px-4"
                >
                    <div
                        className="absolute inset-0 bg-black/70 frosted-glass transition-opacity animate-in fade-in duration-300"
                        onClick={toggleModal}
                    ></div>

                    <div className="min-w-[700px] relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">

                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">{title}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    device settings for the system
                                </p>
                            </div>
                            <button
                                onClick={toggleModal}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5 bg-white/50 dark:bg-gray-900">

                            <div className={`mb-6 p-3 rounded-lg flex items-center justify-between border ${isSuccess
                                ? "bg-green-500/10 border-green-500/20"
                                : "bg-red-500/10 border-red-500/20"
                                }`}>
                                <div className={`flex items-center text-sm font-medium ${isSuccess
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                    }`}>
                                    <span className="material-symbols-outlined mr-2">
                                        {isSuccess ? "check_circle" : "error"}
                                    </span>
                                    {loading ? "Reloading..." : (statusMessage || "Unknown Status")}
                                </div>

                                <button onClick={onReload} className="text-xs font-bold text-primary flex items-center hover:opacity-80 transition-opacity">
                                    <span className="material-symbols-outlined !text-sm mr-1">sync</span>
                                    {loading ? "Reloading..." : "Reload"}
                                </button>
                            </div>

                            {isCamvii ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Serial Number <span className="text-red-400">*</span>
                                            </label>
                                            <Input
                                                placeholder=""
                                                value={form.device_id}
                                                disabled
                                                onChange={(e) => handleChange("device_id", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Persons Entry <span className="text-red-400">*</span>
                                            </label>
                                            <DropDown
                                                placeholder="Select Persons Entry"
                                                width="w-full"
                                                value={form.recognition_mode}
                                                onChange={(value) => handleChange("recognition_mode", value)}
                                                items={RECOGNITION_MODE}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Open Mode <span className="text-red-400">*</span>
                                            </label>
                                            <DropDown
                                                placeholder="Select Open Mode"
                                                width="w-full"
                                                value={form.verification_mode}
                                                onChange={(value) => handleChange("verification_mode", value)}
                                                items={VERIFICATION_MODE}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Duration - Seconds <span className="text-red-400">*</span>
                                            </label>
                                            <DropDown
                                                placeholder="Select Duration"
                                                width="w-full"
                                                value={Number(form.open_duration) || ""}
                                                onChange={(value) => handleChange("open_duration", value)}
                                                items={OPEN_DURATION}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Volume <span className="text-red-400">*</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={Number(form.voice_volume) || 0}
                                                onChange={(e) => handleChange("voice_volume", Number(e.target.value))}
                                                className="flex-1 accent-primary"
                                            />
                                            <span className="text-sm font-semibold text-primary w-12 text-right">
                                                {Number(form.voice_volume) || 0}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">Time</label>
                                        <Input placeholder="" value={form.local_time || ""} disabled onChange={() => { }} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">Wifi IP</label>
                                            <Input placeholder="" value={form.wifi_ip || ""} disabled onChange={() => { }} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">LAN IP</label>
                                            <Input placeholder="" value={form.lan_ip || ""} disabled onChange={() => { }} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">Persons Count</label>
                                        <Input placeholder="" value={form.persons_count ?? ""} disabled onChange={() => { }} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Serial Number <span className="text-red-400">*</span>
                                            </label>
                                            <Input
                                                placeholder=""
                                                value={form.device_id}
                                                onChange={(e) => handleChange("device_id", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Language <span className="text-red-400">*</span>
                                            </label>
                                            <DropDown
                                                placeholder="Select Language"
                                                width="w-full"
                                                value={form.language}
                                                onChange={(value) => handleChange("language", value)}
                                                items={LANGUAGE_FOR_DEVICE} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Volume <span className="text-red-400">*</span>
                                            </label>
                                            <DropDown
                                                placeholder="Select Volume"
                                                width="w-full"
                                                value={form.volume}
                                                onChange={(value) => handleChange("volume", value)}
                                                items={DEVICE_VOLUME} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Device Menu password <span className="text-red-400">*</span>
                                            </label>
                                            <Input
                                                placeholder=""
                                                value={form.menuPassword}
                                                onChange={(e) => handleChange("menuPassword", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Alarm Events Push(msgPush) <span className="text-red-400">*</span>
                                            </label>
                                            <DropDown
                                                placeholder="Select Status"
                                                width="w-full"
                                                value={form.msgPush}
                                                onChange={(value) => handleChange("msgPush", value)}
                                                items={DEVICE_ENABLE_DISABLE} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Time <span className="text-red-400">*</span>
                                            </label>
                                            <Input
                                                placeholder=""
                                                value={form.time}
                                                onChange={(e) => handleChange("time", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Maker - Manufacturer <span className="text-red-400">*</span>
                                            </label>
                                            <Input
                                                placeholder=""
                                                value={form.maker_manufacturer}
                                                onChange={(e) => handleChange("maker_manufacturer", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-400">
                                                Maker - Delivery/Release Date <span className="text-red-400">*</span>
                                            </label>
                                            <Input
                                                placeholder=""
                                                value={form.maker_deliveryDate}
                                                onChange={(e) => handleChange("maker_deliveryDate", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-400">
                                            Maker - Website Link <span className="text-red-400">*</span>
                                        </label>
                                        <Input
                                            placeholder=""
                                            value={form.maker_webAddr}
                                            onChange={(e) => handleChange("maker_webAddr", e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10  flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={toggleModal}
                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-white hover:bg-background-dark transition-all text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={updateSettings}
                                type="button"
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-all text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isCamvii ? "Update Settings" : "Update"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DeviceSettings;
