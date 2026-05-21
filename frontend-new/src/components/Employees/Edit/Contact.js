"use client";
import React, { useEffect, useState } from 'react';
import { BadgeCheck, Play, User, Briefcase, Contact, CreditCard, RefreshCw, Eye, EyeOff, Info, Phone, Home, MapPin, } from 'lucide-react';
import Input from '@/components/Theme/Input';
import { Label, SectionTitle } from '@/components/ui/label';
import DropDown from '@/components/ui/DropDown';
import { generateSecurePassword, notify, parseApiError } from '@/lib/utils';
import ImageUploader from '@/components/ImageUploader';
import { updateContact } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { updateEmployeeContact } from '@/lib/endpoint/employees';

const CONTACT_DEFAULT_PAYLOAD = {
    work_email: "",
    person_email: "",
    work_phone: "",
    mobile_phone: ""
};

const PRESENT_ADDRESS_DEFAULT_PAYLOAD = {
    room_no: "",
    building: "",
    street_address: "",
    landmark: "",
    city: "",
    state: "",
    country: "",
    zip_code: "",
};

const PRIMARY_CONTACT_DEFAULT_PAYLOAD = {
    full_name: "",
    relation: "",
    primary_phone: "",
    alternative_phone: "",
    email: ""
};

const PERMANENT_ADDRESS_DEFAULT_PAYLOAD = PRESENT_ADDRESS_DEFAULT_PAYLOAD;
const SECONDARY_CONTACT_DEFAULT_PAYLOAD = PRIMARY_CONTACT_DEFAULT_PAYLOAD;

const cleanDashes = (obj) => {
    if (!obj) return obj;
    const cleaned = {};
    for (const key in obj) {
        cleaned[key] = obj[key] === "---" ? "" : obj[key];
    }
    return cleaned;
};

const EmployeeContact = ({ action = "Add", payload }) => {

    const { contact, present_address, permanent_address, primary_contact, secondary_contact } = payload;
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [emailErrors, setEmailErrors] = useState({});

    const validateEmail = (field, email) => {
        if (!email || email === "---") { setEmailErrors(prev => ({ ...prev, [field]: "" })); return true; }
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        setEmailErrors(prev => ({ ...prev, [field]: valid ? "" : "Invalid email format" }));
        return valid;
    };
    const [contactInfo, setContactInfo] = useState(CONTACT_DEFAULT_PAYLOAD);
    const [presentAddress, setPresentAddress] = useState(PRESENT_ADDRESS_DEFAULT_PAYLOAD);
    const [permanentAddress, setPermanentAddress] = useState(PERMANENT_ADDRESS_DEFAULT_PAYLOAD);
    const [primaryContact, setPrimaryContact] = useState(PRIMARY_CONTACT_DEFAULT_PAYLOAD);
    const [secondaryContact, setSecondaryContact] = useState(SECONDARY_CONTACT_DEFAULT_PAYLOAD);


    useEffect(() => {
        setContactInfo(cleanDashes(contact) || CONTACT_DEFAULT_PAYLOAD)
    }, [contact]);

    useEffect(() => {
        setPresentAddress(cleanDashes(present_address) || PRESENT_ADDRESS_DEFAULT_PAYLOAD)
    }, [present_address]);

    useEffect(() => {
        setPermanentAddress(cleanDashes(permanent_address) || PERMANENT_ADDRESS_DEFAULT_PAYLOAD)
    }, [permanent_address]);

    useEffect(() => {
        setPrimaryContact(cleanDashes(primary_contact) || PRIMARY_CONTACT_DEFAULT_PAYLOAD)
    }, [primary_contact]);

    useEffect(() => {
        setSecondaryContact(cleanDashes(secondary_contact) || SECONDARY_CONTACT_DEFAULT_PAYLOAD)
    }, [secondary_contact]);



    const [isPermanetButtonButtonClicked, setIsPermanetButtonButtonClicked] = useState(false);

    const handleSyncAddress = (checked) => {
        setIsPermanetButtonButtonClicked(checked);

        if (checked) {
            setPermanentAddress({ ...presentAddress });
        } else {
            // Optional: Clear it or leave it as is
            setPermanentAddress({
                room_no: "",
                building: "",
                street_address: "",
                landmark: "",
                city: "",
                state: "",
                country: "",
                zip_code: "",
            });
        }
    };

    useEffect(() => {
        if (isPermanetButtonButtonClicked) {
            setPermanentAddress({ ...presentAddress });
        }
    }, [presentAddress, isPermanetButtonButtonClicked]);

    const onSubmit = async () => {
        const emailFields = [
            { field: "work_email", value: contactInfo.work_email },
            { field: "person_email", value: contactInfo.person_email },
            { field: "primary_email", value: primaryContact.email },
            { field: "secondary_email", value: secondaryContact.email },
        ];
        let hasInvalidEmail = false;
        emailFields.forEach(({ field, value }) => {
            if (!validateEmail(field, value)) hasInvalidEmail = true;
        });
        if (hasInvalidEmail) {
            await notify("Oops!", "Please fix invalid email addresses.", "error");
            return;
        }

        setLoading(true);

        let formRequest = { contact: contactInfo, present_address: presentAddress, permanent_address: permanentAddress, primary_contact: primaryContact, secondary_contact: secondaryContact };

        try {
            await updateEmployeeContact(formRequest, payload.id)
            await notify("Success!", `Contact ${payload.id ? 'Edited' : 'Created'}.`, "success");
            setLoading(false);
            router.push(`/employees`);
        } catch (error) {
            setLoading(false);
            await notify("Error!", parseApiError(error), "error")
        }
    };

    return (
        <div className="mt-5 bg-white/90 dark:bg-slate-800/85 backdrop-blur-xl border border-white/50 dark:border-slate-700 w-full  rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden relative">
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
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-3">{action} Contact</h1>
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
                        <SectionTitle icon={<Phone size={14} />} title="Contact Info" />
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6">
                                <Label>Work Email</Label>
                                <Input value={contactInfo.work_email} onChange={(e) => { setContactInfo({ ...contactInfo, work_email: e.target.value }); validateEmail("work_email", e.target.value); }} placeholder="employee@email.com"
                                    className={emailErrors.work_email ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""} />
                                {emailErrors.work_email && <p className="text-red-500 text-xs mt-1">{emailErrors.work_email}</p>}
                            </div>
                            <div className="col-span-6">
                                <Label>Personal Email</Label>
                                <Input value={contactInfo.person_email} onChange={(e) => { setContactInfo({ ...contactInfo, person_email: e.target.value }); validateEmail("person_email", e.target.value); }} placeholder="employee@email.com"
                                    className={emailErrors.person_email ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""} />
                                {emailErrors.person_email && <p className="text-red-500 text-xs mt-1">{emailErrors.person_email}</p>}
                            </div>
                            <div className="col-span-6">
                                <Label>Work Phone</Label>
                                <Input value={contactInfo.work_phone} onChange={(e) => setContactInfo({ ...contactInfo, work_phone: e.target.value })} placeholder="971xxxxxxxx" />
                            </div>
                            <div className="col-span-6">
                                <Label>Mobile Phone</Label>
                                <Input value={contactInfo.mobile_phone} onChange={(e) => setContactInfo({ ...contactInfo, mobile_phone: e.target.value })} placeholder="971xxxxxxxx"
                                />
                            </div>

                        </div>

                        <div className="flex items-center justify-between mb-2">
                            <SectionTitle icon={<MapPin size={14} />} title="Present Address" />

                            <label
                                className="px-4 py-2 border border-border text-primary dark:text-white hover:bg-primary-700 text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-primary-200 dark:shadow-none flex items-center gap-2 cursor-pointer transition-all has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-gray-400"
                            >
                                <Checkbox
                                    id="permanent-address"
                                    checked={isPermanetButtonButtonClicked}
                                    onCheckedChange={handleSyncAddress}
                                // If you have a disabled prop, pass it here
                                />
                                <span>
                                    {isPermanetButtonButtonClicked ? 'Saved as Permanent Address' : "Save as Permanent Address"}
                                </span>
                            </label>

                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6">
                                <Label>Room Number</Label>
                                <Input value={presentAddress.room_no} onChange={(e) => setPresentAddress({ ...presentAddress, room_no: e.target.value })} placeholder="Room Number" />
                            </div>
                            <div className="col-span-6">
                                <Label>Building Name</Label>
                                <Input value={presentAddress.building} onChange={(e) => setPresentAddress({ ...presentAddress, building: e.target.value })} placeholder="Building Name" />
                            </div>

                            <div className="col-span-12">
                                <Label>Street Address</Label>
                                <Input value={presentAddress.street_address} onChange={(e) => setPresentAddress({ ...presentAddress, street_address: e.target.value })} placeholder="Street Address" />
                            </div>

                            <div className="col-span-12">
                                <Label>Landmark</Label>
                                <Input value={presentAddress.landmark} onChange={(e) => setPresentAddress({ ...presentAddress, landmark: e.target.value })} placeholder="Landmark" />
                            </div>


                            <div className="col-span-3">
                                <Label>City</Label>
                                <Input value={presentAddress.city} onChange={(e) => setPresentAddress({ ...presentAddress, city: e.target.value })} placeholder="City" />
                            </div>
                            <div className="col-span-3">
                                <Label>State / Province
                                </Label>
                                <Input value={presentAddress.state} onChange={(e) => setPresentAddress({ ...presentAddress, state: e.target.value })} placeholder="State / Province" />
                            </div>

                            <div className="col-span-3">
                                <Label>Country</Label>
                                <Input value={presentAddress.country} onChange={(e) => setPresentAddress({ ...presentAddress, country: e.target.value })} placeholder="Country" />
                            </div>

                            <div className="col-span-3">
                                <Label>Zip Code</Label>
                                <Input value={presentAddress.zip_code} onChange={(e) => setPresentAddress({ ...presentAddress, zip_code: e.target.value })} placeholder="Zip Code" />
                            </div>

                        </div>


                        <SectionTitle icon={<MapPin size={14} />} title="Permanent Address" />

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6">
                                <Label>Room Number</Label>
                                <Input value={permanentAddress.room_no} onChange={(e) => setPermanentAddress({ ...permanentAddress, room_no: e.target.value })} placeholder="Room Number" />
                            </div>
                            <div className="col-span-6">
                                <Label>Building Name</Label>
                                <Input value={permanentAddress.building} onChange={(e) => setPermanentAddress({ ...permanentAddress, building: e.target.value })} placeholder="Building Name" />
                            </div>

                            <div className="col-span-12">
                                <Label>Street Address</Label>
                                <Input value={permanentAddress.street_address} onChange={(e) => setPermanentAddress({ ...permanentAddress, street_address: e.target.value })} placeholder="Street Address" />
                            </div>

                            <div className="col-span-12">
                                <Label>Landmark</Label>
                                <Input value={permanentAddress.landmark} onChange={(e) => setPermanentAddress({ ...permanentAddress, landmark: e.target.value })} placeholder="Landmark" />
                            </div>


                            <div className="col-span-3">
                                <Label>City</Label>
                                <Input value={permanentAddress.city} onChange={(e) => setPermanentAddress({ ...permanentAddress, city: e.target.value })} placeholder="City" />
                            </div>
                            <div className="col-span-3">
                                <Label>State / Province
                                </Label>
                                <Input value={permanentAddress.state} onChange={(e) => setPermanentAddress({ ...permanentAddress, state: e.target.value })} placeholder="State / Province" />
                            </div>

                            <div className="col-span-3">
                                <Label>Country</Label>
                                <Input value={permanentAddress.country} onChange={(e) => setPermanentAddress({ ...permanentAddress, country: e.target.value })} placeholder="Country" />
                            </div>

                            <div className="col-span-3">
                                <Label>Zip Code</Label>
                                <Input value={permanentAddress.zip_code} onChange={(e) => setPermanentAddress({ ...permanentAddress, zip_code: e.target.value })} placeholder="Zip Code" />
                            </div>

                        </div>


                        <SectionTitle icon={<Phone size={14} />} title="Emergency Contacts (Primary)" />

                        <div className="grid grid-cols-12 gap-4">

                            <div className="col-span-6">
                                <Label>Full Name</Label>
                                <Input
                                    value={primaryContact.full_name}
                                    onChange={(e) => setPrimaryContact({ ...primaryContact, full_name: e.target.value })} placeholder="Full Name" />
                            </div>

                            <div className="col-span-6">
                                <Label>Relationship</Label>
                                <DropDown
                                    width="w-full"
                                    items={[
                                        { id: "Spouse", name: "Spouse" },
                                        { id: "Parent", name: "Parent" },
                                        { id: "Sibling", name: "Sibling" },
                                        { id: "Child", name: "Child" },
                                        { id: "Friend", name: "Friend" },
                                        { id: "Other", name: "Other" },
                                    ]}
                                    value={primaryContact.relation}
                                    onChange={(relation) => setPrimaryContact({ ...primaryContact, relation })}
                                />
                            </div>

                            <div className="col-span-6">
                                <Label>Primary Phone</Label>
                                <Input value={primaryContact.primary_phone} onChange={(e) => setPrimaryContact({ ...primaryContact, primary_phone: e.target.value })} placeholder="Primary Phone" />
                            </div>
                            <div className="col-span-6">
                                <Label>Alternative Phone</Label>
                                <Input value={primaryContact.alternative_phone} onChange={(e) => setPrimaryContact({ ...primaryContact, alternative_phone: e.target.value })} placeholder="Alternative Phone" />
                            </div>
                            <div className="col-span-6">
                                <Label>Email Address</Label>
                                <Input value={primaryContact.email} onChange={(e) => { setPrimaryContact({ ...primaryContact, email: e.target.value }); validateEmail("primary_email", e.target.value); }} placeholder="Email Address"
                                    className={`bg-slate-50 dark:bg-slate-800 text-slate-500 ${emailErrors.primary_email ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`} />
                                {emailErrors.primary_email && <p className="text-red-500 text-xs mt-1">{emailErrors.primary_email}</p>}
                            </div>

                        </div>

                        <SectionTitle icon={<Phone size={14} />} title="Emergency Contacts (Secondary)" />

                        <div className="grid grid-cols-12 gap-4">

                            <div className="col-span-6">
                                <Label>Full Name</Label>
                                <Input value={secondaryContact.full_name} onChange={(e) => setSecondaryContact({ ...secondaryContact, full_name: e.target.value })} placeholder="Full Name" />
                            </div>

                            <div className="col-span-6">
                                <Label>Relationship</Label>
                                <DropDown
                                    width="w-full"
                                    items={[
                                        { id: "Spouse", name: "Spouse" },
                                        { id: "Parent", name: "Parent" },
                                        { id: "Sibling", name: "Sibling" },
                                        { id: "Child", name: "Child" },
                                        { id: "Friend", name: "Friend" },
                                        { id: "Other", name: "Other" },
                                    ]}
                                    value={secondaryContact.relation}
                                    onChange={(relation) => setSecondaryContact({ ...secondaryContact, relation })}
                                />
                            </div>

                            <div className="col-span-6">
                                <Label>Primary Phone</Label>
                                <Input value={secondaryContact.primary_phone} onChange={(e) => setSecondaryContact({ ...secondaryContact, primary_phone: e.target.value })} placeholder="Primary Phone" />
                            </div>
                            <div className="col-span-6">
                                <Label>Alternative Phone</Label>
                                <Input value={secondaryContact.alternative_phone} onChange={(e) => setSecondaryContact({ ...secondaryContact, alternative_phone: e.target.value })} placeholder="Alternative Phone" />
                            </div>
                            <div className="col-span-6">
                                <Label>Email Address</Label>
                                <Input value={secondaryContact.email} onChange={(e) => { setSecondaryContact({ ...secondaryContact, email: e.target.value }); validateEmail("secondary_email", e.target.value); }} placeholder="Email Address"
                                    className={`bg-slate-50 dark:bg-slate-800 text-slate-500 ${emailErrors.secondary_email ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`} />
                                {emailErrors.secondary_email && <p className="text-red-500 text-xs mt-1">{emailErrors.secondary_email}</p>}
                            </div>

                        </div>

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => router.push('/employees')}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all bg-red-500 hover:bg-red-600 text-white shadow-md">
                        Cancel
                    </button>
                    <button
                        disabled={loading}
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

                <ImageUploader existingImage={payload.profile_picture} />

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

export default EmployeeContact;