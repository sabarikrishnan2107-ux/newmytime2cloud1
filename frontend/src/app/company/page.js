// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Upload, Image, ArrowLeft } from "lucide-react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import useImageUpload from "@/hooks/useImageUpload";

import Profile from "@/components/Company/Profile";
import Contact from "@/components/Company/Contact";
import License from "@/components/Company/License";

import Document from "@/components/Company/Document/Index";
import Password from "@/components/Company/Password";
import Branch from "@/components/Branch/Page";
import ChangeLogo from "@/components/Company/ChangeLogo";
import { getCompanyInfo, getVisitorLink } from "@/lib/api";
import VisitorAppLink from "@/components/Company/VisitorAppLink";
import { parseApiError } from "@/lib/utils";
import WorkingSchedule from "@/components/Company/WorkingSchedule";


const Company = () => {

  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [contactData, setContactData] = useState(null);
  const [licenseData, setLicenseData] = useState(null);



  const [formData, setFormData] = useState({
    companyName: "MYTIME CLOUD",
    legalName: "MyTime Solutions Inc.",
    registrationNo: "REG-8842-XJ9",
    industry: "Technology & Software",
    website: "mytime.cloud",
    address: "101 Innovation Dr, Suite 500, San Francisco, CA 94103",
    primaryContact: {
      name: "Sarah Connor",
      designation: "HR Director",
      email: "sarah@mytime.cloud",
      phone: "+1 (555) 012-3456"
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {

    const fetchData = async () => {
      try {
        const { data } = await getCompanyInfo();

        if (data.record) {

          let result = data.record;

          let profile = {
            company_code: result.company_code,
            name: result.name,
            email: result.user?.email,
            member_from: result.member_from,
            expiry: result.expiry,
            max_branches: result.max_branches,
            max_employee: result.max_employee,
            max_devices: result.max_devices,
          };

          setProfileData(profile);
          setContactData(result.contact);
          setLicenseData(result.trade_license);
        }

      } catch (error) {
        console.error("Error fetching company info:", parseApiError(error));
      }
    };

    fetchData().finally(() => setIsLoading(false));

  }, []);


  const router = useRouter();

  // const tabs = [
  //   {
  //     label: "Info",
  //     value: "company",
  //     component: <Profile profile={profileData} isLoading={isLoading} />,
  //   },
  //   {
  //     label: "Contact",
  //     value: "contact",
  //     component: <Contact contact={contactData} isLoading={isLoading} />,
  //   },
  //   {
  //     label: "License",
  //     value: "license",
  //     component: <License license={licenseData} isLoading={isLoading} />,
  //   },
  //   {
  //     label: "Documents",
  //     value: "documents",
  //     component: <Document />,
  //   },
  //   {
  //     label: "Password",
  //     value: "password",
  //     component: <Password />,
  //   },
  //   {
  //     label: "Door Pin",
  //     value: "door_pin",
  //     component: <DoorPin pin={pin} isLoading={isLoading} />,
  //   },
  // ];



  // 1. Initialize state with the ID of the default tab
  const [activeTab, setActiveTab] = useState('tab-gen');

  // 2. Data structure for the tabs to keep the JSX clean
  const tabs = [
    { id: 'tab-gen', label: 'General Information' },
    { id: 'tab-branch', label: 'Branch Management' },
    { id: 'tab-schedule', label: 'Working Schedule' },
    { id: 'tab-docs', label: 'Documents' },
    { id: 'tab-password', label: 'Password' },
  ];

  const handleGoBack = () => router.push(`/`);

  return (
    <div className="p-15  overflow-y-auto height-[800px]">
      <div className="w-full">

        <div className="flex items-center gap-4 mb-10">
          <button className="md:hidden text-slate-500">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-600 dark:text-slate-300  tracking-tight">
              Company Profile
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Manage your organization identity and settings
            </p>
          </div>
        </div>
        {/* Tab Headers */}
        <div className="flex ">
          {tabs.map((tab) => (
            <label
              key={tab.id}
              className={`
              cursor-pointer mr-8 pb-3 border-b-2 font-medium text-sm transition-all
              ${activeTab === tab.id
                  ? 'text-primary border-indigo-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'}
            `}
            >
              <input
                type="radio"
                name="tabs"
                className="hidden"
                checked={activeTab === tab.id}
                onChange={() => setActiveTab(tab.id)}
              />
              {tab.label}
            </label>
          ))}
        </div>


        {/* Tab Content Area */}
        <div className="py-6">
          {activeTab === 'tab-gen' && <Profile profile={profileData} contact={contactData} isLoading={isLoading} /> }
          {activeTab === 'tab-branch' && <Branch />}
          {activeTab === 'tab-schedule' && <WorkingSchedule />}
          {activeTab === 'tab-docs' && <Document />}
          {activeTab === 'tab-password' && <Password />}
        </div>
      </div>
    </div>
  );
};

export default Company;
