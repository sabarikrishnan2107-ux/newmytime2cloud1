"use client";
import React, { useState } from 'react';
import {
    BadgeCheck,
    Save,
    X,
    Play,
    User,
    Briefcase,
    Contact,
    CreditCard,
    Lock,
    RefreshCw,
    Eye,
    EyeOff,
    Camera,
    CheckCircle2,
    Info,
    Smartphone
} from 'lucide-react';
import Input from '@/components/Theme/Input';
import { Label, SectionTitle } from '@/components/ui/label';
import Dropdown from '@/components/Theme/DropDown';
import RadioGroup from '@/components/Theme/RadioGroup';

const EmployeeProfileForm = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState('pass1234');
    const [gender, setGender] = useState('Male');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');

    const validateEmail = (val) => {
        if (!val) { setEmailError(''); return true; }
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        setEmailError(valid ? '' : 'Invalid email format');
        return valid;
    };

    const generatePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let newPass = "";
        for (let i = 0; i < 12; i++) {
            newPass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(newPass);
        setShowPassword(true);
    };

    return (
        <div className='px-5 py-3'>
            <div className="mt-5 bg-white/90 dark:bg-slate-800/85 backdrop-blur-xl border border-white/50 dark:border-slate-700 w-full  rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden relative h-[95vh] lg:h-auto lg:max-h-[92vh]">

                {/* Left Section: Form */}
                <div className="flex-1 flex flex-col h-full overflow-hidden order-2 lg:order-1 border-r border-slate-200 dark:border-slate-700">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
                        <div>
                            <div className="flex items-center gap-2">
                                <BadgeCheck className="text-primary" size={22} />
                                <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary">New Enrollment</h2>
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-3">Add Employee</h1>
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
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-4">
                                    <Label>Title</Label>
                                    <Dropdown width="w-full" items={[
                                        { id: "Mr.", name: "Mr." },
                                        { id: "Ms.", name: "Ms." },

                                    ]} />
                                </div>
                                <div className="col-span-4">
                                    <Label>First Name</Label>
                                    <Input placeholder="Jonathan" />
                                </div>
                                <div className="col-span-4">
                                    <Label>Last Name</Label>
                                    <Input placeholder="Doe" />
                                </div>
                                <div className="col-span-4">
                                    <Label>Display</Label>
                                    <Input placeholder="John D." />
                                </div>
                                <div className="col-span-4">
                                    <Label>Full Name (System Generated)</Label>
                                    <Input placeholder="Jonathan Doe" readOnly className="bg-slate-50 dark:bg-slate-800 text-slate-500" />
                                </div>



                                <div className="col-span-4">
                                    <Label>Gender</Label>
                                    <RadioGroup
                                        options={[
                                            { label: "Male", value: "Male" },
                                            { label: "Female", value: "Female" },
                                        ]}
                                        selectedValue={gender}
                                        onChange={setGender}
                                    />
                                </div>
                            </div>

                            {/* Employment Details */}
                            <SectionTitle icon={<Briefcase size={14} />} title="Employment Details" />
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-3">
                                    <Label>Employee Type</Label>
                                    <Dropdown width="w-full"
                                        items={[
                                            { id: "Full Time", name: "Full Time" },
                                            { id: "Part Time", name: "Part Time" },
                                            { id: "Contractor", name: "Contractor" },
                                        ]} />
                                </div>
                                <div className="col-span-3">
                                    <Label>Branch</Label>
                                    <Dropdown width="w-full"
                                        items={[
                                            { id: "Engineering", name: "Engineering" },
                                            { id: "Sales", name: "Sales" },
                                        ]} />

                                </div>
                                <div className="col-span-3">
                                    <Label>Dept</Label>
                                    <Dropdown width="w-full"
                                        items={[
                                            { id: "Engineering", name: "Engineering" },
                                            { id: "Sales", name: "Sales" },
                                        ]} />

                                </div>
                                <div className="col-span-3">
                                    <Label>Position</Label>

                                    <Dropdown width="w-full"
                                        items={[
                                            { id: "Software Engineer", name: "Software Engineer" },
                                            { id: "Product Manager", name: "Product Manager" },
                                        ]} />
                                </div>
                                <div className="col-span-4">
                                    <Label>Employee ID</Label>
                                    <Input placeholder="EMP-001" />
                                </div>
                                <div className="col-span-4">
                                    <Label>Employee Device ID</Label>
                                    <Input placeholder="EMP-001" />
                                </div>

                                <div className="col-span-4">
                                    <Label>Joined Date</Label>
                                    <Input type="date" />
                                </div>

                            </div>

                            {/* Contact Info */}
                            <SectionTitle icon={<Contact size={14} />} title="Contact Info" />
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-6"><Label>Mobile</Label><Input type="tel" placeholder="971xxxxxxxxx" /></div>
                                <div className="col-span-6"><Label>Email</Label>
                                    <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
                                        placeholder="hr@company.com" className={emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""} />
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
                        <button className="px-4 py-2 bg-primary hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-primary-200 dark:shadow-none flex items-center gap-2">
                            Submit
                        </button>
                    </div>
                </div>

                {/* Right Section: Biometric Sidebar */}
                <div className="w-full lg:w-80 xl:w-80 bg-slate-50/90 dark:bg-slate-900/60 p-6 flex flex-col items-center gap-6 order-1 lg:order-2 overflow-y-auto">
                    <div className="w-full flex justify-between items-center text-gray-600 dark:text-slate-300">
                        <h3 className="font-bold text-sm ">Biometric Data</h3>
                        <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-[10px] font-bold border border-slate-200 dark:border-white/10 ">AI READY</span>
                    </div>

                    <div className="relative group cursor-pointer" onClick={() => alert('Trigger Camera')}>
                        <div className="w-40 h-40 rounded-full border-4 border-gray-200 dark:border-white/10 shadow-xl overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center ring-1 ring-slate-200 dark:ring-white/10 hover:ring-primary-500 transition-all">
                            <Camera size={40} className="text-slate-400 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>

                    {/* Quality Check */}
                    <div className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Quality Check</span>
                            <span className="text-xs font-bold text-emerald-600">Excellent (92%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[92%]" />
                        </div>
                    </div>

                    {/* Auth Methods */}
                    <div className="w-full space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-bold flex items-center gap-2 text-gray-600 dark:text-slate-300"><CreditCard size={14} /> Authentication</h4>
                        <div>
                            <Label>RFID Card</Label>
                            <Input placeholder="Scan Card..." />
                        </div>
                        <div>
                            <Label>System Password</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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
        </div>
    );
};

export default EmployeeProfileForm;