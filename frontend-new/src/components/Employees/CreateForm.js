"use client";
import React, { useEffect, useState } from 'react';
import { BadgeCheck, Play, User, Briefcase, Contact, CreditCard, RefreshCw, Eye, EyeOff, Info, } from 'lucide-react';
import Input from '@/components/Theme/Input';
import { Label, SectionTitle } from '@/components/ui/label';
import RadioGroup from '@/components/Theme/RadioGroup';
import DropDown from '@/components/ui/DropDown';
import { generateSecurePassword, notify, parseApiError } from '@/lib/utils';
import DatePicker from '@/components/ui/DatePicker';
import ImageUploader from '@/components/ImageUploader';
import { getBranches, getDepartments, getDesignations, storeEmployee, updateEmployee } from '@/lib/api';
import { useRouter } from 'next/navigation';

const CreateForm = ({ action = "Add", payload }) => {

    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [form, setForm] = useState({
        title: "Mr.",
        first_name: "",
        last_name: "",
        full_name: "",
        display_name: "",
        employee_id: 0,
        joining_date: null,
        branch_id: 1,
        phone_number: "",
        whatsapp_number: "",
        system_user_id: 0,
        department_id: 1,
        designation_id: 1,
        rfid_card_number: "",
        gender: "Male",
        profile_image_base64: null,
        employee_type: "Full Time",

        nationality: "",
        date_of_birth: null,
        religion: "",
        blood_group: "",
        marital_status: "",
        email: "",
        password: ""
    });
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);

    const [loading, setLoading] = useState(false);


    useEffect(() => {
        setForm(payload);
    }, [payload])

    const fetchBranches = async () => {
        try {
            setBranches(await getBranches());
        } catch (error) {
            await notify("Oops!", parseApiError(error), "error")
        }
    };

    const fetchDesignations = async () => {
        try {
            let data = (await getDesignations());
            setDesignations(data.data);
        } catch (error) {
            await notify("Oops!", parseApiError(error), "error")
        }
    };

    useEffect(() => {
        fetchBranches();
        fetchDesignations();
    }, []);


    useEffect(() => {
        // Reset departments and department_id if no branch is selected
        if (!form.branch_id) {
            setDepartments([]);
            return;
        }

        const fetchDepartments = async () => {
            try {
                setDepartments(await getDepartments(form.branch_id));
            } catch (error) {
                console.error("Error fetching departments:", error);
                await notify("Oops!", "Error fetching departments", "error")
                setDepartments([]); // Clear departments on error
            }
        };
        fetchDepartments();
    }, [form.branch_id]);


    const generatePassword = () => {
        setForm({
            ...form,
            password: generateSecurePassword()
        })
        setShowPassword(true);
    };

    useEffect(() => {
        setForm(prev => ({
            ...prev,
            full_name: `${prev.first_name} ${prev.last_name}`.trim()
        }));
    }, [form.first_name, form.last_name]);

    const handleImageUpload = (e) => {
        setForm({ ...form, profile_image_base64: e });

    }

    const validateEmail = (email) => {
        if (!email) { setEmailError(""); return true; }
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        setEmailError(valid ? "" : "Invalid email format");
        return valid;
    };

    const onSubmit = async () => {
        if (form.email && !validateEmail(form.email)) {
            await notify("Oops!", "Please enter a valid email address.", "error");
            return;
        }
        if (!form.employee_type) {
            await notify("Oops!", "Please select Employee Type.", "error");
            return;
        }

        setLoading(true);

        try {
            form.id ? await updateEmployee(form, payload.id) : await storeEmployee(form)
            await notify("Success!", `Employee ${form.id ? 'Edit' : 'Create'}.`, "success");
            setLoading(false);
            router.push(`/employees`);
        } catch (error) {
            setLoading(false);
            await notify("Oops!", parseApiError(error), "error")
        }
    };

    return (
        <div className="mt-5 bg-white/90 dark:bg-slate-800/85 backdrop-blur-xl border border-white/50 dark:border-slate-700 w-full  rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden relative h-[95vh] lg:h-auto lg:max-h-[92vh]">
            {/* Left Section: Form */}
            <div className="flex-1 flex flex-col h-full overflow-hidden order-2 lg:order-1 border-r border-slate-200 dark:border-slate-700">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
                    <div>
                        {action == 'Add' &&
                            <div className="flex items-center gap-2">
                                <BadgeCheck className="text-primary" size={22} />
                                <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary">New Enrollment</h2>
                            </div>
                        }
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-3">{action} Employee</h1>
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        <a href="#" className="group flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-red-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full transition-all border border-slate-200 dark:border-slate-600 shadow-sm">
                            <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <Play size={10} fill="currentColor" />
                            </span>
                            Watch Tutorial Video
                        </a>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <form className="space-y-6">

                        {/* Personal Info */}
                        <SectionTitle icon={<User size={14} />} title="Personal Information" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-4">
                                <Label>Title</Label>
                                <DropDown
                                    width="w-full"
                                    items={[
                                        { id: "Mr.", name: "Mr." },
                                        { id: "Mrs.", name: "Mrs." },
                                        { id: "Ms.", name: "Ms." },
                                        { id: "Dr.", name: "Dr." },
                                    ]}
                                    value={form.title}
                                    onChange={(title) => setForm({ ...form, title })}
                                />
                            </div>
                            <div className="lg:col-span-4">
                                <Label>First Name</Label>
                                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Jonathan" />
                            </div>
                            <div className="lg:col-span-4">
                                <Label>Last Name</Label>
                                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Doe" />
                            </div>
                            <div className="lg:col-span-4">
                                <Label>Display</Label>
                                <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="John D." />
                            </div>
                            <div className="lg:col-span-4">
                                <Label>Full Name</Label>
                                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jonathan Doe" readOnly className="bg-slate-50 dark:bg-slate-800 text-slate-500" />
                            </div>



                            <div className="lg:col-span-4">
                                <Label>Gender</Label>
                                <RadioGroup
                                    options={[
                                        { label: "Male", value: "Male" },
                                        { label: "Female", value: "Female" },
                                    ]}
                                    selectedValue={form.gender}
                                    onChange={(e) => setForm({ ...form, gender: e })}
                                />
                            </div>

                            <div className="lg:col-span-4">
                                <Label>Religion</Label>
                                <Input value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })} placeholder="Religion" className="bg-slate-50 dark:bg-slate-800 text-slate-500" />
                            </div>

                            <div className="lg:col-span-4">
                                <Label>Nationality</Label>
                                <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} placeholder="Nationality" className="bg-slate-50 dark:bg-slate-800 text-slate-500" />
                            </div>

                            <div className="lg:col-span-4">
                                <Label>Blood Group</Label>
                                <DropDown width="w-full"
                                    value={form.blood_group}
                                    onChange={(e) => setForm({ ...form, blood_group: e })}
                                    items={[
                                        { id: "O+", name: "O+" },
                                        { id: "O-", name: "O-" },
                                        { id: "A+", name: "A+" },
                                        { id: "A-", name: "A-" },
                                        { id: "B+", name: "B+" },
                                        { id: "B-", name: "B-" },
                                        { id: "AB+", name: "AB+" },
                                        { id: "AB-", name: "AB-" },
                                    ]} />
                            </div>

                            <div className="lg:col-span-4">
                                <Label>Marital Status</Label>
                                <DropDown width="w-full"
                                    value={form.marital_status}
                                    onChange={(e) => setForm({ ...form, marital_status: e })}
                                    items={[
                                        { id: "Married", name: "Married" },
                                        { id: "Single", name: "Single" },
                                        { id: "Divorced", name: "Divorced" },
                                        { id: "Widowed", name: "Widowed" },
                                    ]} />

                            </div>

                            <div className="lg:col-span-4">
                                <Label>Date Of Birth</Label>
                                <DatePicker
                                    value={form.date_of_birth}
                                    onChange={(e) => setForm({ ...form, date_of_birth: e })}
                                    maxDate={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d; })()}
                                />
                            </div>


                        </div>

                        {/* Employment Details */}
                        <SectionTitle icon={<Briefcase size={14} />} title="Employment Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-3">
                                <Label>Employee Type *</Label>
                                <DropDown width="w-full"
                                    placeholder="Select Employee Type"
                                    value={form.employee_type}
                                    onChange={(e) => setForm({ ...form, employee_type: e })}
                                    items={[
                                        { id: "Full Time", name: "Full Time" },
                                        { id: "Part Time", name: "Part Time" },
                                        { id: "Contractor", name: "Contractor" },
                                        { id: "Trainee", name: "Trainee" },
                                    ]} />
                            </div>
                            <div className="lg:col-span-3">
                                <Label>Branch</Label>
                                <DropDown
                                    placeholder="Select Branch"
                                    width="w-full"
                                    value={form.branch_id}
                                    onChange={(e) => setForm({ ...form, branch_id: e })}
                                    items={branches}
                                />
                            </div>
                            <div className="lg:col-span-3">
                                <Label>Dept</Label>
                                <DropDown width="w-full"
                                    value={form.department_id}
                                    onChange={(e) => setForm({ ...form, department_id: e })}
                                    items={departments} />

                            </div>
                            <div className="lg:col-span-3">
                                <Label>Position</Label>

                                <DropDown width="w-full"
                                    value={form.designation_id}
                                    onChange={(e) => setForm({ ...form, designation_id: e })}
                                    items={designations} />
                            </div>
                            <div className="lg:col-span-4">
                                <Label>Employee ID</Label>
                                <Input maxLength={16} value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value.slice(0, 16) })} placeholder="EMP-001" />
                            </div>
                            <div className="lg:col-span-4">
                                <Label>Employee Device ID</Label>
                                <Input maxLength={16} value={form.system_user_id} onChange={(e) => setForm({ ...form, system_user_id: e.target.value.slice(0, 16) })} placeholder="EMP-001" />
                            </div>

                            <div className="lg:col-span-4">
                                <Label>Joined Date</Label>
                                <DatePicker value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e })} />
                            </div>

                        </div>

                        {/* Contact Info */}
                        <SectionTitle icon={<Contact size={14} />} title="Contact Info" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-6"><Label>Mobile</Label>
                                <Input
                                    value={form.phone_number}
                                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                                    placeholder="971xxxxxxxxx"
                                />
                            </div>
                            <div className="lg:col-span-6">
                                <Label>Email</Label>
                                <Input type="email" value={form.email}
                                    onChange={(e) => { setForm({ ...form, email: e.target.value }); validateEmail(e.target.value); }}
                                    placeholder="hr@company.com"
                                    className={emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""} />
                                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 flex justify-end gap-3">
                    <button className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-500
dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-300">
                        Cancel
                    </button>
                    <button
                        disabled={!form.profile_image_base64 || loading}
                        onClick={onSubmit}
                        className="px-4 py-2 bg-primary hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-primary-200 dark:shadow-none flex items-center gap-2 
             disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none transition-all"
                    >
                        {loading ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </div>

            {/* Right Section: Biometric Sidebar */}
            <div className="w-full lg:w-80 xl:w-80 bg-slate-50/90 dark:bg-slate-900/60 p-6 flex flex-col items-center gap-6 order-1 lg:order-2 overflow-y-auto">
                <div className="w-full flex justify-between items-center text-gray-600 dark:text-slate-300">
                    <h3 className="font-bold text-sm ">Biometric Data</h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-[10px] font-bold border border-slate-200 dark:border-white/10 ">AI READY</span>
                </div>

                <ImageUploader onImageSet={handleImageUpload} existingImage={form.profile_picture} />

                {/* Auth Methods */}
                <div className="w-full space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-bold flex items-center gap-2 text-gray-600 dark:text-slate-300"><CreditCard size={14} /> Authentication</h4>
                    <div>
                        <Label>RFID Card</Label>
                        <Input value={form.rfid_card_number} onChange={(e) => setForm({ ...form, rfid_card_number: e.target.value })} placeholder="Scan Card..." />
                    </div>
                    <div>
                        <Label>System Password</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={(e) => setForm({
                                        ...form,
                                        password: e.target.value
                                    })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-primary-500"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <button
                                onClick={generatePassword}
                                className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-30 hover:text-primary transition-colors"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Guidelines */}
                <div className="mt-auto w-full pt-4 border-t border-slate-200 dark:border-slate-700 text-slate-500">
                    <h4 className="text-[10px] font-bold uppercase mb-2 flex items-center gap-1"><Info size={12} /> Guidelines</h4>
                    <ul className="text-[10px] space-y-1">
                        <li>• Neutral expression, eyes open.</li>
                        <li>• Even lighting, no shadows.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CreateForm;