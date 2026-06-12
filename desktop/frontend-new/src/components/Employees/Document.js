"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteDocument, getDocuments, uploadEmployeeDocument } from "@/lib/api";
import { getEmployeeDocumentDonwloadLink } from "@/lib/utils";


const Document = ({ employee_id }) => {
    const [documents, setDocuments] = useState([]);
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchDocuments = async () => {
        try {
            setDocuments(await getDocuments(employee_id));
        } catch {
            setDocuments([]);
        }
    };

    // fetch documents
    useEffect(() => {
        fetchDocuments();
    }, [employee_id]);

    const resetForm = () => {
        setTitle("");
        setFile(null);
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setSubmitting(true);
        try {
            await uploadEmployeeDocument(employee_id, { title, file });
            fetchDocuments();
            resetForm();
            setOpen(false);
        } catch (err) {
            console.error(err);
            // Optionally show a toast here
        } finally {
            setSubmitting(false);
        }
    };

    const onDelete = async (id) => {
        setSubmitting(true);
        try {
            await deleteDocument(id);
            fetchDocuments();
            resetForm();
            setOpen(false);
        } catch (err) {
            console.error(err);
            // Optionally show a toast here
        } finally {
            setSubmitting(false);
        }
    };


    return <>
        <div
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Documents
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Oversee the verification and renewal cycles for passport, visa, and residency documents.
                </p>
            </div>
        </div>
        <div
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[minmax(140px,auto)]"
        >
            <div
                className="glass-card col-span-3 md:col-span-3 lg:col-span-3 row-span-2 p-6 flex flex-col rounded-lg relative overflow-hidden group"
            >
                <div
                    className="flex items-center justify-between mb-6 relative z-10"
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="size-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-primary/10 flex items-center justify-center text-primary shadow-inner ring-1 ring-white/10"
                        >
                            <span
                                className="material-symbols-outlined text-[32px] icon-fill"
                            >folder_shared</span
                            >
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-600 dark:text-gray-300 tracking-tight">
                                Personal ID
                            </h2>
                            <div
                                className="flex items-center gap-2 text-sm text-[#9db0b9] mt-0.5"
                            >
                                <span>4 Files</span>
                                <span className="size-1 bg-[#5f717a] rounded-full"></span>
                                <span>8.2 MB</span>
                            </div>
                        </div>
                    </div>

                    <button
                        className="h-8 w-8 pt-1 rounded-xl bg-primary
    "
                    > <span className="material-symbols-outlined">add</span>
                    </button>
                </div>
                <div
                    className="flex flex-col gap-2 relative z-10 flex-1 overflow-y-auto custom-scrollbar pr-1"
                >
                    <div
                        className="text-gray-600 dark:text-gray-300 flex items-center p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group/file cursor-pointer"
                    >
                        <div
                            className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mr-4 shrink-0 shadow-sm"
                        >
                            <span className="material-symbols-outlined"
                            >picture_as_pdf</span
                            >
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4
                                    className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate group-hover/file:text-primary transition-colors"
                                >
                                    Passport_Scan_2024.pdf
                                </h4>
                                {/* <span
                                    className="hidden group-hover/file:block text-[10px] bg-primary/20 text-primary px-1.5 rounded uppercase font-bold tracking-wider"
                                >New</span
                                > */}
                            </div>
                            <p className="text-xs text-[#9db0b9] mt-0.5">
                                2.4 MB • Uploaded Jan 12, 2024
                            </p>
                        </div>
                        <button
                            className="p-2  text-gray-600 dark:text-gray-300"
                        >
                            <span className="material-symbols-outlined">download</span>
                        </button>
                    </div>
                    <div
                        className="flex items-center p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group/file cursor-pointer"
                    >
                        <div
                            className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mr-4 shrink-0 shadow-sm"
                        >
                            <span className="material-symbols-outlined">image</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4
                                className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate group-hover/file:text-primary transition-colors"
                            >
                                Drivers_License_Front.jpg
                            </h4>
                            <p className="text-xs text-[#9db0b9] mt-0.5">
                                4.1 MB • Uploaded Feb 10, 2023
                            </p>
                        </div>
                        <button
                            className="p-2  text-gray-600 dark:text-gray-300"
                        >
                            <span className="material-symbols-outlined">download</span>
                        </button>
                    </div>
                    <div
                        className="flex items-center p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group/file cursor-pointer"
                    >
                        <div
                            className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mr-4 shrink-0 shadow-sm"
                        >
                            <span className="material-symbols-outlined">description</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4
                                className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate group-hover/file:text-primary transition-colors"
                            >
                                Social_Security_Card.pdf
                            </h4>
                            <p className="text-xs text-[#9db0b9] mt-0.5">
                                850 KB • Uploaded Mar 05, 2023
                            </p>
                        </div>
                        <button
                            className="p-2 text-gray-600 dark:text-gray-300"
                        >
                            <span className="material-symbols-outlined">download</span>
                        </button>
                    </div>
                </div>
                <div
                    className="absolute -right-8 -bottom-10 opacity-[0.03] pointer-events-none rotate-12"
                >
                    <span className="material-symbols-outlined text-[240px]"
                    >folder_shared</span
                    >
                </div>
            </div>
            <div
                className="glass-card col-span-1 md:col-span-1 lg:col-span-1 row-span-1 p-5 flex flex-col rounded-lg relative overflow-hidden group hover:border-primary/30"
            >
                <div className="flex items-start justify-between mb-2 ">
                    <div
                        className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 mb-3 group-hover:bg-orange-500/20 transition-colors"
                    >
                        <span
                            className="material-symbols-outlined text-[28px] icon-fill"
                        >work_history</span
                        >
                    </div>
                    <span
                        className="bg-primary text-xs uppercase tracking-wider px-2 py-1 rounded"
                    >2 Files</span
                    >
                </div>
                <h3 className="text-lg font-bold text-white mb-4">Employment</h3>
                <div className="flex flex-col gap-2 mt-auto">
                    <div
                        className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <span
                            className="material-symbols-outlined text-sm text-[#9db0b9]"
                        >description</span
                        >
                        <span className="text-sm text-white truncate"
                        >Contract_2024.pdf</span
                        >
                    </div>
                    <div
                        className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <span
                            className="material-symbols-outlined text-sm text-[#9db0b9]"
                        >description</span
                        >
                        <span className="text-sm text-white truncate"
                        >Offer_Letter.docx</span
                        >
                    </div>
                </div>
            </div>

            <div
                className="glass-card col-span-1 md:col-span-1 lg:col-span-1 row-span-1 p-5 flex flex-col rounded-lg relative overflow-hidden group hover:border-primary/30"
            >
                <div className="flex items-start justify-between mb-2">
                    <div
                        className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3 group-hover:bg-purple-500/20 transition-colors"
                    >
                        <span
                            className="material-symbols-outlined text-[28px] icon-fill"
                        >workspace_premium</span
                        >
                    </div>
                    <span
                        className="bg-primary text-xs uppercase tracking-wider px-2 py-1 rounded"
                    >3 Files</span
                    >
                </div>
                <h3 className="text-lg font-bold text-white mb-4">
                    Certifications
                </h3>
                <div className="flex flex-col gap-2 mt-auto">
                    <div
                        className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <span
                            className="material-symbols-outlined text-sm text-[#9db0b9]"
                        >picture_as_pdf</span
                        >
                        <span className="text-sm text-white truncate"
                        >AWS_Solutions_Architect.pdf</span
                        >
                    </div>
                    <div
                        className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                    >
                        <span
                            className="material-symbols-outlined text-sm text-[#9db0b9]"
                        >picture_as_pdf</span
                        >
                        <span className="text-sm text-white truncate"
                        >PMP_Certificate_2023.pdf</span
                        >
                    </div>
                </div>
            </div>
        </div>
    </>
};

export default Document;
