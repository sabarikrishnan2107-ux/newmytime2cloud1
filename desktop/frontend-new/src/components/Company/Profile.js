import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import DropDown from "@/components/ui/DropDown";
import {
    getCompanyLogo,
    getCompanyProfile,
    updateCompanyLogo,
    updateCompanyProfile,
    updateCompanyProfileContact,
} from "@/lib/endpoint/company";
import { convertFileToBase64, notify, parseApiError } from "@/lib/utils";

export default function CompanyProfile({ profile, contact, isLoading: parentLoading = false }) {
    const companyQrTargetUrl = "https://mytime2cloud.com/login/";
    const industryOptions = [
        { id: "Technology & Software", name: "Technology & Software" },
        { id: "Manufacturing", name: "Manufacturing" },
        { id: "Healthcare", name: "Healthcare" },
        { id: "Retail", name: "Retail" },
    ];

    const [isLoading, setIsLoading] = useState(parentLoading);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [logoDirty, setLogoDirty] = useState(false);
    const [companyQrImageUrl, setCompanyQrImageUrl] = useState("");

    const toDateInputValue = (value) => {
        if (!value) return "";
        if (typeof value === "string") {
            const normalized = value.replace(/\//g, "-");
            const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
            return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
        }
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return "";
        return parsedDate.toISOString().split("T")[0];
    };

    useEffect(() => {
        const generateQr = async () => {
            try {
                const dataUrl = await QRCode.toDataURL(companyQrTargetUrl, {
                    width: 360,
                    margin: 1,
                    color: {
                        dark: "#0f172a",
                        light: "#ffffff",
                    },
                });
                setCompanyQrImageUrl(dataUrl);
            } catch (_) {
                setCompanyQrImageUrl("");
            }
        };

        generateQr();
    }, [companyQrTargetUrl]);

    const initialState = useMemo(
        () => ({
            companyName: profile?.name || "",
            legalName: profile?.legal_name || "",
            registrationNo: profile?.company_code || "",
            memberFrom: toDateInputValue(profile?.member_from),
            expiryDate: toDateInputValue(profile?.expiry),
            maxBranches: profile?.max_branches || "",
            maxEmployees: profile?.max_employee || "",
            maxDevices: profile?.max_devices || "",
            industry: profile?.industry || "Technology & Software",
            website: profile?.website || "",
            address: profile?.location || "",
            primaryName: contact?.name || "",
            primaryDesignation: contact?.position || "",
            primaryEmail: profile?.email || "",
            primaryPhone: contact?.number || "",
            primaryWhatsapp: contact?.whatsapp || contact?.number || "",
            secondaryName: "",
            secondaryDesignation: "",
            secondaryEmail: "",
            secondaryPhone: "",
            logo: null,
            timezone: "Option 1",
            currency: "Option 1",
            language: "Option 1",
        }),
        [profile, contact]
    );

    const [form, setForm] = useState(initialState);
    const initialRef = useRef(initialState);

    useEffect(() => {
        initialRef.current = initialState;
        setForm(initialState);
        setIsLoading(parentLoading);
    }, [initialState, parentLoading]);

    useEffect(() => {
        const hydrate = async () => {
            if (profile || contact) return;

            setIsLoading(true);
            try {
                const company = await getCompanyProfile();
                const logo = await getCompanyLogo();

                const nextState = {
                    companyName: company?.name || "",
                    legalName: company?.legal_name || "",
                    registrationNo: company?.company_code || "",
                    memberFrom: toDateInputValue(company?.member_from),
                    expiryDate: toDateInputValue(company?.expiry),
                    maxBranches: company?.max_branches || "",
                    maxEmployees: company?.max_employee || "",
                    maxDevices: company?.max_devices || "",
                    industry: company?.industry || "Technology & Software",
                    website: company?.website || "",
                    address: company?.location || "",
                    primaryName: company?.contact?.name || "",
                    primaryDesignation: company?.contact?.position || "",
                    primaryEmail: company?.user?.email || "",
                    primaryPhone: company?.contact?.number || "",
                    primaryWhatsapp: company?.contact?.whatsapp || company?.contact?.number || "",
                    secondaryName: "",
                    secondaryDesignation: "",
                    secondaryEmail: "",
                    secondaryPhone: "",
                    logo: logo || company?.logo || null,
                    timezone: "Option 1",
                    currency: "Option 1",
                    language: "Option 1",
                };

                initialRef.current = nextState;
                setForm(nextState);
            } catch (err) {
                setError(parseApiError(err));
            } finally {
                setIsLoading(false);
            }
        };

        hydrate();
    }, [profile, contact]);

    useEffect(() => {
        const loadLogo = async () => {
            if (!profile && !contact) return;
            try {
                const logo = await getCompanyLogo();
                if (logo) {
                    setForm((prev) => ({ ...prev, logo }));
                    initialRef.current = { ...initialRef.current, logo };
                }
            } catch (_) {
            }
        };

        loadLogo();
    }, [profile, contact]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const base64 = await convertFileToBase64(file);
            setForm((prev) => ({ ...prev, logo: base64 }));
            setLogoDirty(true);
        } catch {
            setError("Unable to read selected logo file.");
        }
    };

    const handleCancel = () => {
        setForm(initialRef.current);
        setLogoDirty(false);
        setError(null);
    };

    const handleSave = async () => {
        setError(null);

        if (!form.companyName?.trim()) {
            setError("Company name is required.");
            return;
        }

        if (!form.primaryName?.trim() || !form.primaryDesignation?.trim() || !form.primaryPhone?.trim() || !form.primaryWhatsapp?.trim()) {
            setError("Primary contact fields are required.");
            return;
        }

        setIsSaving(true);
        try {
            await updateCompanyProfile({
                name: form.companyName,
                legal_name: form.legalName,
                member_from: form.memberFrom,
                expiry: form.expiryDate,
                max_branches: form.maxBranches,
                max_employee: form.maxEmployees,
                max_devices: form.maxDevices,
                industry: form.industry,
                website: form.website,
                location: form.address,
            });

            await updateCompanyProfileContact({
                name: form.primaryName,
                position: form.primaryDesignation,
                number: form.primaryPhone,
                whatsapp: form.primaryWhatsapp,
            });

            if (logoDirty && form.logo) {
                await updateCompanyLogo(form.logo);
            }

            initialRef.current = { ...form };
            setLogoDirty(false);
            notify("Saved", "Company profile updated successfully.", "success");
        } catch (err) {
            setError(parseApiError(err));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">
                Loading company profile...
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 flex flex-col gap-8">
                    <section className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <Header icon="badge" title="Company Identity" description="Legal information and public profile" color="indigo" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label="Company Name" span>
                                <Input name="companyName" value={form.companyName} bold readOnly />
                            </Field>

                            <Field label="Company Email" span>
                                <Input name="primaryEmail" value={form.primaryEmail} bold readOnly />
                            </Field>

                            <Field label="Legal Name">
                                <Input name="legalName" value={form.legalName} readOnly />
                            </Field>

                            <Field label="Registration No.">
                                <Input name="registrationNo" value={form.registrationNo} onChange={handleChange} readOnly />
                            </Field>

                            <Field label="Member From">
                                <Input name="memberFrom" value={form.memberFrom} readOnly />
                            </Field>

                            <Field label="Expiry Date">
                                <Input name="expiryDate" value={form.expiryDate} readOnly />
                            </Field>

                            <Field label="Max Branches">
                                <Input name="maxBranches" value={form.maxBranches} readOnly min="0" />
                            </Field>

                            <Field label="Max Employees">
                                <Input name="maxEmployees" value={form.maxEmployees} readOnly min="0" />
                            </Field>

                            <Field label="Max Devices">
                                <Input name="maxDevices" value={form.maxDevices} readOnly min="0" />
                            </Field>

                            <Field label="Industry">
                                <DropDown
                                    items={industryOptions}
                                    value={form.industry}
                                    onChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            industry: value || "",
                                        }))
                                    }
                                    placeholder="Select Industry"
                                    width="w-full"
                                />
                            </Field>



                            <Field label="Website">
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium">
                                        https://
                                    </span>
                                    <Input name="website" value={form.website} readOnly rounded="r" />
                                </div>
                            </Field>
                        </div>
                    </section>

                    <section className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 md:p-8">
                        <Header icon="business" title="Location & Contact" description="Headquarters and contact points" color="emerald" />

                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-48 bg-slate-100 dark:bg-slate-800 relative">
                            <iframe
                                allowFullScreen=""
                                className="grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
                                height="100%"
                                loading="lazy"
                                src={`https://www.google.com/maps?q=${encodeURIComponent(form.address || "")}&hl=en&z=15&output=embed`}
                                style={{ border: "0", width: "100%" }}
                            ></iframe>
                        </div>

                        <Field label="Full Address" className="mt-4">
                            <Textarea name="address" value={form.address} readOnly />
                        </Field>

                        <Divider title="Primary Manager Contact" icon="person" />
                        <ContactGrid
                            values={{
                                name: form.primaryName,
                                designation: form.primaryDesignation,
                                phone: form.primaryPhone,
                                whatsapp: form.primaryWhatsapp,
                            }}
                            prefix="primary"
                            readOnly
                        />

                    </section>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-8">
                    <section className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition-shadow">
                        <Header icon="qr_code_2" title="Company QR Code" description="Scan for mobile app access" />

                        <div className="flex flex-col items-center justify-center p-6 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl relative group cursor-pointer">
                            <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition rounded-xl" />

                            <div className="w-36 h-36 rounded-xl bg-white p-2 border border-slate-200 shadow-sm mb-4 z-10">
                                {companyQrImageUrl ? (
                                    <img
                                        src={companyQrImageUrl}
                                        alt="Company QR"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                                        Loading QR...
                                    </div>
                                )}
                            </div>

                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Standard Access Token
                            </p>

                            <a
                                href={companyQrImageUrl}
                                download="mytime2cloud-login-qr.png"
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 z-10"
                            >
                                <span className="material-symbols-outlined text-sm">download</span>
                                Download QR
                            </a>
                        </div>
                    </section>

                    <section className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 md:p-8">
                        <Header icon="palette" title="Corporate Branding" description="Look and feel customization" />

                        <div className="mb-8">
                            <Label>Company Logo</Label>
                            <label className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-white/80 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 transition p-6 flex flex-col items-center gap-4 cursor-pointer shadow-sm">
                                <div className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/50 p-5 flex items-center justify-center">
                                    <div className="w-28 h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                                    {form.logo ? (
                                        <img src={form.logo} alt="Company Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-4xl">
                                            cloud_circle
                                        </span>
                                    )}
                                    </div>
                                </div>
                                <div className="text-center text-sm">
                                    <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                                        <span className="material-symbols-outlined text-base">upload</span>
                                        {form.logo ? "Replace logo" : "Upload logo"}
                                    </span>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">SVG, PNG, JPG (max 2MB)</p>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                            </label>
                        </div>
                    </section>

                </div>
            </div>

            {error && (
                <div className="w-full mt-4 px-2">
                    <div className="p-3 rounded-lg border border-red-400/30 bg-red-500/10 text-red-600 dark:text-red-300 text-sm">
                        {error}
                    </div>
                </div>
            )}

            <div className="w-full mt-10">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 px-6 flex justify-end shadow-sm">
                    <div className="flex gap-3 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 dark:bg-slate-800 transition"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-8 py-2.5 rounded-lg font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition"
                        >
                            <span className="material-symbols-outlined text-[20px]">check</span>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

function Header({ icon, title, description, color }) {
    return (
        <div className="flex items-center gap-4 mb-8">
            <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600 dark:bg-${color}-500/10 dark:text-${color}-400`}>
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
            </div>
        </div>
    );
}

function Field({ label, children, span, className }) {
    return (
        <div className={`${span ? "md:col-span-2" : ""} ${className || ""}`}>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-300">{label}</label>
            {children}
        </div>
    );
}

function Input({ value, bold, rounded, name, onChange, placeholder, readOnly = false, type = "text", min }) {
    return (
        <input
            type={type}
            min={min}
            name={name}
            value={value || ""}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`w-full px-4 py-3 rounded-${rounded || "lg"} border bg-white/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 ${bold ? "font-semibold" : ""} focus:ring-2 focus:ring-indigo-500/20`}
        />
    );
}

const Label = ({ children }) => (
    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-600 dark:text-slate-300">{children}</label>
);

const SelectSideBar = ({ label, name, value, onChange }) => (
    <div>
        <Label>{label}</Label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-white/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
        >
            <option>Option 1</option>
        </select>
    </div>
);

function Select({ options, name, value, onChange }) {
    return (
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-4 py-3 rounded-lg border bg-white/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20"
        >
            {options.map((option) => (
                <option key={option}>{option}</option>
            ))}
        </select>
    );
}

function Textarea({ value, name, onChange, readOnly = false }) {
    return (
        <textarea
            rows={2}
            name={name}
            value={value || ""}
            onChange={onChange}
            readOnly={readOnly}
            className="w-full px-4 py-3 rounded-lg border bg-white/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 resize-none"
        />
    );
}

function Divider({ title, icon }) {
    return (
        <div className="flex items-center gap-2 my-6 border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="material-symbols-outlined text-slate-400 text-sm">{icon}</span>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">{title}</h3>
        </div>
    );
}

function ContactGrid({ values = {}, prefix = "", onChange, readOnly = false }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name={`${prefix}Name`} onChange={onChange} placeholder="Contact Name" value={values.name} readOnly={readOnly} />
            <Input name={`${prefix}Designation`} onChange={onChange} placeholder="Designation" value={values.designation} readOnly={readOnly} />
            <Input name={`${prefix}Phone`} onChange={onChange} placeholder="Phone" value={values.phone} readOnly={readOnly} />
            {prefix === "primary" && (
                <Input name="primaryWhatsapp" onChange={onChange} placeholder="Whatsapp" value={values.whatsapp} readOnly={readOnly} />
            )}
        </div>
    );
}

const ColorPicker = ({ label, value }) => (
    <div>
        <Label>{label}</Label>
        <div className="flex items-center gap-2 p-2 bg-white/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <input type="color" defaultValue={value} className="w-8 h-8 rounded" />
            <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>
        </div>
    </div>
);
