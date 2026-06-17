// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getBranches, createDevice, testCameraConnection } from "@/lib/api";
import { compressImage, notify, parseApiError } from "@/lib/utils";
import Input from "../Theme/Input";
import TextArea from "../Theme/TextArea";
import DropDown from "../ui/DropDown";
import timezones from "@/lib/timezones";
import { DEVICE_TYPES, FUNCTIONS, MODEL_NUMBERS, STATUSSES } from "@/lib/dropdowns";

let defaultPayload = {
  branch_id: "",
  name: "test",
  short_name: "test",
  location: "test",
  model_number: "MYTIME1",
  device_id: "",
  utc_time_zone: "Asia/Dubai",
  function: "auto",
  device_type: "all",
  status_id: 1,
  door_pin: "",
  ip: "0.0.0.0",
  camera_rtsp_ip: "",
  camera_rtsp_port: "554",
  camera_rtsp_path: "",
  camera_username: "",
  camera_password: "",
  camera_sdk_url: "",
  admin_username: "admin",
  admin_password: "admin1234",
  device_photo: null,
};

const DeviceCreate = ({ onSuccess = () => { } }) => {

  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const [branches, setBranches] = useState([]);

  const toggleModal = () => setOpen(!open);

  const fetchBranches = async () => {
    try {
      setBranches(await getBranches());
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    }
  };

  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [cameraTestResult, setCameraTestResult] = useState(null);

  const [form, setForm] = useState(defaultPayload);

  useEffect(() => {
    if (open) {
      fetchBranches();
      setForm(defaultPayload);
      setCameraTestResult(null);
    }
  }, [open]);

  const handleChange = (field, value) => {
    const updatedForm = { ...form, [field]: value };

    // If model_number is changed to Camera, auto-set function to "auto"
    if (field === "model_number" && value === "Camera") {
      updatedForm.function = "auto";
    }

    setForm(updatedForm);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let { data } = await createDevice(form);

      // FIX: Check if status is explicitly false
      if (data?.status === false) {
        // Check if data.errors actually exists and has keys
        if (data.errors && Object.keys(data.errors).length > 0) {
          const firstKey = Object.keys(data.errors)[0];
          console.log(data.errors);
          notify("Error", data.errors[firstKey][0], "error");
        } else {
          // Fallback if status is false but no specific error object exists
          notify("Error", data?.message, "error");
        }
        return;
      }

      // Success Path
      onSuccess();
      setSuccessOpen(true);
      setOpen(false);
      notify("Success", "Device Saved", "success")
    } catch (error) {
      console.log(error);

      notify("Error", parseApiError(error), "error");

    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!form.camera_rtsp_ip && !form.camera_rtsp_path) {
      notify("Error", "Enter the camera IP address or a full RTSP URL before testing.", "error");
      return;
    }

    setTestingConnection(true);
    setCameraTestResult(null);

    try {
      const result = await testCameraConnection({
        camera_rtsp_ip: form.camera_rtsp_ip,
        camera_rtsp_port: form.camera_rtsp_port,
        camera_rtsp_path: form.camera_rtsp_path,
        camera_username: form.camera_username,
        camera_password: form.camera_password,
      });

      setCameraTestResult(result);

      const bestCandidate = result?.record?.best_candidate;
      if (bestCandidate?.camera_rtsp_port) {
        handleChange("camera_rtsp_port", String(bestCandidate.camera_rtsp_port));
      }
      if (bestCandidate?.camera_rtsp_path) {
        handleChange("camera_rtsp_path", bestCandidate.camera_rtsp_path);
      }

      notify(
        result?.status ? "Success" : "Camera Test",
        result?.message || "Camera test completed",
        result?.status ? "success" : "error"
      );
    } catch (error) {
      notify("Error", parseApiError(error), "error");
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="bg-primary hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-primary/20"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Device
      </button>

      {/* Side Panel */}
      <div
        aria-modal="true"
        role="dialog"
        className={`fixed inset-x-0 bottom-0 top-[72px] z-50 ${open ? 'visible' : 'invisible'}`}
      >
        {/* Backdrop/Overlay */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={toggleModal}
        ></div>

        {/* Side Panel */}
        <div className={`absolute top-0 right-0 h-full w-full max-w-[520px] bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-white/10 transform transition-transform duration-300 ease-in-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>

          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">Add Device</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Create a new device in the system
              </p>
            </div>
            <button
              onClick={toggleModal}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full p-1"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-5 bg-white/50 dark:bg-gray-900 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">
                  Branch <span className="text-red-400">*</span>
                </label>
                <DropDown
                  placeholder="Select Branch"
                  width="w-full"
                  value={form.branch_id}
                  onChange={(value) => handleChange("branch_id", value)}
                  items={branches} />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">
                  Device Photo
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                      {form.device_photo ? (
                        <img src={form.device_photo} alt="Device" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-slate-400 text-3xl">add_a_photo</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
                          handleChange("device_photo", compressed);
                        } catch (err) {
                          notify("Error", "Could not load image", "error");
                        }
                      }}
                    />
                  </label>
                  {form.device_photo && (
                    <button
                      type="button"
                      onClick={() => handleChange("device_photo", null)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">
                    Device Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Main Door"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">
                    Prefix <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g. MD"
                    value={form.short_name}
                    onChange={(e) => handleChange("short_name", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">
                  Location <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Dubai"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">
                    Model Number <span className="text-red-400">*</span>
                  </label>
                  <DropDown
                    placeholder="Select Model Number"
                    width="w-full"
                    value={form.model_number}
                    onChange={(value) => handleChange("model_number", value)}
                    items={MODEL_NUMBERS} />
                </div>

                {form.model_number !== "Camera" ? (
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
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-400">
                      Camera IP Address <span className="text-red-400">*</span>
                    </label>
                    <Input
                      placeholder="e.g. 192.168.1.100"
                      value={form.camera_rtsp_ip}
                      onChange={(e) => handleChange("camera_rtsp_ip", e.target.value)}
                    />
                  </div>
                )}
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">
                    Timezone <span className="text-red-400">*</span>
                  </label>
                  <DropDown
                    placeholder="Select Timezone"
                    width="w-full"
                    value={form.utc_time_zone}
                    onChange={(value) => handleChange("utc_time_zone", value)}
                    items={timezones} />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">
                    Function <span className="text-red-400">*</span>
                  </label>
                  <DropDown
                    placeholder="Select Function"
                    width="w-full"
                    value={form.function}
                    onChange={(value) => handleChange("function", value)}
                    items={FUNCTIONS} />
                </div>
              </div>

              {form.model_number === "Camera" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-400">
                      Camera Username <span className="text-red-400">*</span>
                    </label>
                    <Input
                      placeholder="admin"
                      value={form.camera_username}
                      onChange={(e) => handleChange("camera_username", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-400">
                      Camera Password <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter password"
                      value={form.camera_password}
                      onChange={(e) => handleChange("camera_password", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {(form.model_number || "").startsWith("OX-") && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-400">
                      Device URL <span className="text-red-400">*</span>
                    </label>
                    <Input
                      placeholder="http://192.168.1.100"
                      value={form.camera_sdk_url}
                      onChange={(e) => handleChange("camera_sdk_url", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-400">
                      Admin Username
                    </label>
                    <Input
                      placeholder="admin"
                      value={form.admin_username}
                      onChange={(e) => handleChange("admin_username", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-400">
                      Admin Password
                    </label>
                    <Input
                      type="text"
                      placeholder="admin1234"
                      value={form.admin_password}
                      onChange={(e) => handleChange("admin_password", e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">
                    Device Type <span className="text-red-400">*</span>
                  </label>
                  <DropDown
                    placeholder="Select Device Type"
                    width="w-full"
                    value={form.device_type}
                    onChange={(value) => handleChange("device_type", value)}
                    items={DEVICE_TYPES} />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">
                    Status <span className="text-red-400">*</span>
                  </label>
                  <DropDown
                    placeholder="Select Status"
                    width="w-full"
                    value={form.status_id}
                    onChange={(value) => handleChange("status_id", value)}
                    items={STATUSSES} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-400">
                    Door PIN <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="4-digit PIN (e.g. 1234)"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.door_pin}
                    onChange={(e) => handleChange("door_pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={toggleModal}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-white hover:bg-background-dark transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-all text-sm font-bold shadow-lg shadow-primary/20"
              >
                {loading ? "Saving..." : "Add Device"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default DeviceCreate;
