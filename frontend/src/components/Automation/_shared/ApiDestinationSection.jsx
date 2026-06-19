"use client";

import React from "react";
import { testApiConnection } from "@/lib/endpoint/automation";
import { notify } from "@/lib/utils";

const FIELD_INPUT_CLS =
    "w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20";

function Field({ label, children, wide = false }) {
    return (
        <div className={"space-y-0.5 " + (wide ? "col-span-2" : "")}>
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 ml-0.5 uppercase tracking-wider">
                {label}
            </label>
            {children}
        </div>
    );
}

function StatusBadge({ status, message }) {
    if (status === "idle") return null;
    const config = {
        testing: { icon: "progress_activity", text: "Testing...", cls: "text-slate-400", spin: true },
        ok: { icon: "check_circle", text: message || "OK", cls: "text-emerald-500" },
        failed: { icon: "error", text: message || "Failed", cls: "text-rose-500" },
    }[status];
    if (!config) return null;
    return (
        <div className={`flex items-center gap-1 text-xs font-medium ${config.cls}`}>
            <span className={`material-symbols-outlined text-[14px] ${config.spin ? "animate-spin" : ""}`}>
                {config.icon}
            </span>
            <span className="max-w-[140px] truncate" title={config.text}>{config.text}</span>
        </div>
    );
}

export default function ApiDestinationSection({ config, onChange, isEditing = false }) {
    const [testStatus, setTestStatus] = React.useState({ status: "idle", message: "" });

    const cfg = config || {
        endpoint: "",
        auth_type: "none",
        auth_value: "",
        auth_header_name: "X-API-Key",
    };

    const setField = (k, v) => {
        onChange({ ...cfg, [k]: v });
        if (testStatus.status !== "idle") setTestStatus({ status: "idle", message: "" });
    };

    const onTest = async () => {
        try {
            setTestStatus({ status: "testing", message: "" });
            const res = await testApiConnection(cfg);
            if (res?.ok) {
                setTestStatus({ status: "ok", message: `HTTP ${res.status_code ?? 200}` });
                notify?.("Success", `API reachable (HTTP ${res.status_code ?? "?"})`, "success");
            } else {
                setTestStatus({ status: "failed", message: res?.error || `HTTP ${res?.status_code ?? "?"}` });
                notify?.("Failed", res?.error || `API failed (HTTP ${res?.status_code ?? "?"})`, "error");
            }
        } catch (e) {
            setTestStatus({ status: "failed", message: e?.message || "Error" });
            notify?.("Failed", e?.message || String(e), "error");
        }
    };

    const secretPlaceholder = isEditing ? "Leave blank to keep existing" : "Secret value";

    return (
        <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3.5 shadow-elevation-1 border border-gray-200 dark:border-white/5">
            <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">api</span>
                    <h2 className="text-xs font-bold text-gray-600 dark:text-white uppercase tracking-wider">API Destination</h2>
                    <StatusBadge status={testStatus.status} message={testStatus.message} />
                </div>
                <button
                    type="button"
                    onClick={onTest}
                    disabled={testStatus.status === "testing"}
                    className="px-2 py-1 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-[12px]">wifi_tethering</span>
                    {testStatus.status === "testing" ? "Testing" : "Test"}
                </button>
            </div>

            {/* Decoy fields stop Chrome from autofilling saved login credentials. */}
            <input type="text" name="api-username-decoy" autoComplete="username" style={{ display: "none" }} />
            <input type="password" name="api-password-decoy" autoComplete="current-password" style={{ display: "none" }} />

            <div className="grid grid-cols-2 gap-2">
                <Field label="Endpoint URL" wide>
                    <input
                        type="url"
                        value={cfg.endpoint ?? ""}
                        onChange={(e) => setField("endpoint", e.target.value)}
                        placeholder="https://api.example.com/reports"
                        className={FIELD_INPUT_CLS}
                        autoComplete="off"
                        name="api_endpoint"
                    />
                </Field>

                <Field label="Auth Type" wide={cfg.auth_type === "none"}>
                    <select
                        value={cfg.auth_type}
                        onChange={(e) => setField("auth_type", e.target.value)}
                        className={FIELD_INPUT_CLS}
                    >
                        <option value="none">None</option>
                        <option value="api_key">API Key (header)</option>
                        <option value="bearer">Bearer token</option>
                        <option value="basic">Basic auth</option>
                    </select>
                </Field>

                {cfg.auth_type === "api_key" && (
                    <Field label="Header Name">
                        <input
                            type="text"
                            value={cfg.auth_header_name ?? ""}
                            onChange={(e) => setField("auth_header_name", e.target.value)}
                            placeholder="X-API-Key"
                            className={FIELD_INPUT_CLS}
                            autoComplete="off"
                            name="api_header_name"
                        />
                    </Field>
                )}
                {cfg.auth_type === "api_key" && (
                    <Field label="Key Value" wide>
                        <input
                            type="password"
                            value={cfg.auth_value ?? ""}
                            placeholder={secretPlaceholder}
                            onChange={(e) => setField("auth_value", e.target.value)}
                            className={FIELD_INPUT_CLS}
                            autoComplete="new-password"
                            name="api_key_value"
                        />
                    </Field>
                )}
                {cfg.auth_type === "bearer" && (
                    <Field label="Token" wide>
                        <input
                            type="password"
                            value={cfg.auth_value ?? ""}
                            placeholder={secretPlaceholder}
                            onChange={(e) => setField("auth_value", e.target.value)}
                            className={FIELD_INPUT_CLS}
                            autoComplete="new-password"
                            name="api_bearer_token"
                        />
                    </Field>
                )}
                {cfg.auth_type === "basic" && (
                    <Field label="Username:Password" wide>
                        <input
                            type="password"
                            value={cfg.auth_value ?? ""}
                            placeholder={isEditing ? "Leave blank to keep existing" : "user:pass"}
                            onChange={(e) => setField("auth_value", e.target.value)}
                            className={FIELD_INPUT_CLS}
                            autoComplete="new-password"
                            name="api_basic_value"
                        />
                    </Field>
                )}
            </div>
        </section>
    );
}
