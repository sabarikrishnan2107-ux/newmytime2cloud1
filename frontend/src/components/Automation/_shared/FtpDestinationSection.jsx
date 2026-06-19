"use client";

import React from "react";
import { testFtpConnection } from "@/lib/endpoint/automation";
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

export default function FtpDestinationSection({ config, onChange, isEditing = false }) {
    const [testStatus, setTestStatus] = React.useState({ status: "idle", message: "" });

    const cfg = config || {
        protocol: "ftp",
        host: "",
        port: 21,
        username: "",
        password: "",
        remote_path: "/",
    };

    const setField = (k, v) => {
        onChange({ ...cfg, [k]: v });
        if (testStatus.status !== "idle") setTestStatus({ status: "idle", message: "" });
    };

    const onProtocolChange = (e) => {
        const proto = e.target.value;
        onChange({ ...cfg, protocol: proto, port: proto === "sftp" ? 22 : 21 });
        if (testStatus.status !== "idle") setTestStatus({ status: "idle", message: "" });
    };

    const onTest = async () => {
        try {
            setTestStatus({ status: "testing", message: "" });
            const res = await testFtpConnection(cfg);
            if (res?.ok) {
                setTestStatus({ status: "ok", message: "Verified" });
                notify?.("Success", "FTP connection OK", "success");
            } else {
                setTestStatus({ status: "failed", message: res?.error || "Failed" });
                notify?.("Failed", res?.error || "FTP connection failed", "error");
            }
        } catch (e) {
            setTestStatus({ status: "failed", message: e?.message || "Error" });
            notify?.("Failed", e?.message || String(e), "error");
        }
    };

    const passwordPlaceholder = isEditing ? "Leave blank to keep existing" : "FTP password";

    return (
        <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3.5 shadow-elevation-1 border border-gray-200 dark:border-white/5">
            <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">dns</span>
                    <h2 className="text-xs font-bold text-gray-600 dark:text-white uppercase tracking-wider">FTP Destination</h2>
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
            <input type="text" name="ftp-username-decoy" autoComplete="username" style={{ display: "none" }} />
            <input type="password" name="ftp-password-decoy" autoComplete="current-password" style={{ display: "none" }} />

            <div className="grid grid-cols-2 gap-2">
                <Field label="Protocol">
                    <select value={cfg.protocol} onChange={onProtocolChange} className={FIELD_INPUT_CLS}>
                        <option value="ftp">FTP</option>
                        <option value="sftp">SFTP</option>
                    </select>
                </Field>
                <Field label="Port">
                    <input
                        type="number"
                        value={cfg.port ?? ""}
                        onChange={(e) => setField("port", Number(e.target.value))}
                        className={FIELD_INPUT_CLS}
                        autoComplete="off"
                    />
                </Field>
                <Field label="Host" wide>
                    <input
                        type="text"
                        value={cfg.host ?? ""}
                        onChange={(e) => setField("host", e.target.value)}
                        placeholder="ftp.example.com"
                        className={FIELD_INPUT_CLS}
                        autoComplete="off"
                        name="ftp_host"
                    />
                </Field>
                <Field label="Username">
                    <input
                        type="text"
                        value={cfg.username ?? ""}
                        onChange={(e) => setField("username", e.target.value)}
                        className={FIELD_INPUT_CLS}
                        autoComplete="off"
                        name="ftp_username"
                        placeholder="username"
                    />
                </Field>
                <Field label="Password">
                    <input
                        type="password"
                        value={cfg.password ?? ""}
                        placeholder={passwordPlaceholder}
                        onChange={(e) => setField("password", e.target.value)}
                        className={FIELD_INPUT_CLS}
                        autoComplete="new-password"
                        name="ftp_password"
                    />
                </Field>
                <Field label="Remote Path" wide>
                    <input
                        type="text"
                        value={cfg.remote_path ?? ""}
                        onChange={(e) => setField("remote_path", e.target.value)}
                        placeholder="/reports/"
                        className={FIELD_INPUT_CLS}
                        autoComplete="off"
                        name="ftp_remote_path"
                    />
                </Field>
            </div>
        </section>
    );
}
