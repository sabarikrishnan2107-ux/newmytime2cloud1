"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    PERMISSION_TYPES,
    modules,
    active_module,
    card_content
} from '@/lib/permissions';

// UI Components (Ensure these paths match your project)
import ModuleAccess from '@/components/RoleAndPermission/ModuleAccess';
import BasicDetails from '@/components/RoleAndPermission/BasicDetails';
import { Checkbox } from '@/components/ui/checkbox';
import { storeRole, updateRole } from '@/lib/api';
import { parseApiError } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function AttendanceTable() {


    const router = useRouter();

    // 1. Single State for everything
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        modules: active_module,
        permissions: {}
    });

    const [globalError, setGlobalError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState(null);
    const isEditing = !!editId;

    // Edit mode: read ?id from the URL (window.location avoids the Next
    // static-export useSearchParams Suspense requirement) and prefill from the
    // role stashed in sessionStorage by the list page (has modules+permissions).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const id = new URLSearchParams(window.location.search).get('id');
        if (!id) return;
        setEditId(id);
        try {
            const raw = sessionStorage.getItem('editRole');
            if (!raw) return;
            const role = JSON.parse(raw);
            const allOff = Object.fromEntries(Object.keys(active_module).map((k) => [k, false]));
            setFormData({
                name: role.name || '',
                description: role.description || '',
                modules: { ...allOff, ...(role.modules || {}) },
                permissions: role.permissions || {},
            });
        } catch (e) {
            // ignore malformed cache
        }
    }, []);

    // 2. Helper: Update Name/Description
    const updateField = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // 3. Helper: Toggle Module Visibility
    const handleToggle = (id) => {
        setFormData(prev => ({
            ...prev,
            modules: {
                ...prev.modules,
                [id]: !prev.modules[id],
            },
        }));
    };

    // 4. Helper: Individual Checkbox Change
    const handlePermissionChange = (moduleKey, subModuleId, permissionKey, isChecked) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleKey]: {
                    ...prev.permissions[moduleKey],
                    [subModuleId]: {
                        ...prev.permissions[moduleKey]?.[subModuleId],
                        [permissionKey]: !!isChecked
                    }
                }
            }
        }));
    };

    // 5. Helper: Toggle Full Row (e.g., all "Employee Directory" perms)
    const handleToggleRow = (moduleKey, subModuleId, isChecked) => {
        const rowPermissions = {};
        PERMISSION_TYPES.forEach(perm => {
            rowPermissions[perm.key] = !!isChecked;
        });

        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleKey]: {
                    ...prev.permissions[moduleKey],
                    [subModuleId]: rowPermissions
                }
            }
        }));
    };



    const onSubmit = async () => {

        setGlobalError(null);
        setLoading(true);

        try {

            let { data } = isEditing
                ? await updateRole(editId, formData)
                : await storeRole(formData);

            await new Promise(resolve => setTimeout(resolve, 2000));

            if (!data.status) {
                setGlobalError(Object.values(data?.errors)[0][0]);
                return;
            }


            router.push(`/roles`);

        } catch (error) {
            let m = parseApiError(error);
            setGlobalError(m);
            setLoading(false);
        }
    };

    return (
        <div className="p-5 overflow-y-auto max-h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-600 dark:text-slate-300 tracking-tight mb-2">{isEditing ? 'Edit Role' : 'Create New Role'}</h1>
                    <p className="text-slate-500 text-sm">Configure access levels and specific permissions.</p>

                    {globalError && (
                        <div className="mt-4 p-3 border border-red-700 text-red-700 rounded-lg" role="alert">
                            {globalError}
                        </div>
                    )}
                </div>


                <div className="flex gap-3">
                    <Link href="/roles">
                        <button className="px-5 py-2.5 border border-border rounded-lg text-slate-600 font-semibold">Cancel</button>
                    </Link>
                    <button onClick={onSubmit} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-all">
                        {loading ? 'Saving...' : (isEditing ? 'Update Role' : 'Save Role')}
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {/* Form Sections */}
                <BasicDetails formData={formData} updateField={updateField} />
                <ModuleAccess modules={modules} activeOptions={formData.modules} handleToggle={handleToggle} />

                {/* Permission Tables */}
                {Object.keys(formData.modules)
                    .filter((key) => formData.modules[key] === true)
                    .map((key, index) => (
                        <section key={key} className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800">{index + 3}</div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-600 dark:text-slate-300">{card_content[key]?.title}</h2>
                                        <p className="text-xs text-slate-500">{card_content[key]?.desc}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left text-sm table-fixed">
                                    <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4">Feature</th>
                                            <th className="px-6 py-4 text-center">All</th>
                                            {PERMISSION_TYPES.map((perm) => (
                                                <th key={perm.key} className="px-6 py-4 text-center">{perm.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {card_content[key]?.sub_modules.map((row) => (
                                            <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-slate-700 dark:text-slate-200">{row.title}</p>
                                                </td>
                                                {/* Row Multi-Select */}
                                                <td className="px-6 py-4 text-center">
                                                    <Checkbox onCheckedChange={(checked) => handleToggleRow(key, row.id, checked)} className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer" />
                                                </td>
                                                {/* Individual Permissions */}
                                                {PERMISSION_TYPES.map((perm) => (
                                                    <td key={perm.key} className="px-6 py-4 text-center">
                                                        <Checkbox
                                                            checked={formData.permissions?.[key]?.[row.id]?.[perm.key] || false}
                                                            onCheckedChange={(checked) => handlePermissionChange(key, row.id, perm.key, checked)}
                                                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ))}
            </div>
        </div>
    );
}