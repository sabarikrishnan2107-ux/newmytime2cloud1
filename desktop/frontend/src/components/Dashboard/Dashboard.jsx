"use client";

import AttendanceCard from "@/components/Dashboard/AttendanceCard";
import EventsAndInsights from "@/components/Dashboard/EventsAndInsights";
import FireAlarmPopup from "@/components/Dashboard/FireAlarmPopup";
import LiveFeed from "@/components/Dashboard/LiveFeed";
import Stats from "@/components/Dashboard/Stats";
import WelnessCard from "@/components/Dashboard/WelnessCard";
import { getBranches, getDepartmentsByBranchIds } from "@/lib/api";
import { parseApiError } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../Theme/DropDown";
import MultiDropDown from "../ui/MultiDropDown";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [branches, setBranches] = useState([]);
  const [error, setError] = useState(null);

  const fetchBranches = async () => {
    try {
      setBranches(await getBranches());
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    const fetchDepartments = async (selectedBranchIds) => {
      try {
        setDepartments(await getDepartmentsByBranchIds(selectedBranchIds));
      } catch (error) {
        setError(parseApiError(error));
      }
    };
    fetchDepartments(selectedBranchIds);
  }, [selectedBranchIds]);

  return (
    <div className="p-4 pb-24 overflow-y-auto max-h-[calc(100vh-100px)]">
      <FireAlarmPopup />
      <div className="px-2 mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-extrabold text-gray-700 dark:text-gray-100 font-display tracking-tight">
          {t('dashboard.header.pageTitle')}
        </h2>

        <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
          <div className="relative">
            <MultiDropDown
              items={branches}
              value={selectedBranchIds}
              onChange={(item) => {
                setSelectedBranchIds(item);
              }}
              placeholder={t('dashboard.header.selectBranchPlaceholder')}
            />
          </div>
          <div className="relative">
            <MultiDropDown
              placeholder={t('dashboard.header.selectDepartmentPlaceholder')}
              items={departments}
              value={selectedDepartmentIds}
              onChange={setSelectedDepartmentIds}
              badgesCount={1}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 pb-16 custom-scrollbar flex flex-col gap-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <Stats
            branch_ids={selectedBranchIds}
            departments_ids={selectedDepartmentIds}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:h-[340px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden flex flex-col h-full">
              <AttendanceCard
                branch_ids={selectedBranchIds}
                departments_ids={selectedDepartmentIds}
              />
            </div>
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden flex flex-col h-full items-center justify-center">
              <WelnessCard
                branch_ids={selectedBranchIds}
                departments_ids={selectedDepartmentIds}
              />
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-0 relative overflow-hidden flex flex-col h-[340px]">
            <EventsAndInsights
              branch_ids={selectedBranchIds}
              departments_ids={selectedDepartmentIds}
            />
          </div>
        </div>
        <div className="glass-panel rounded-2xl flex-1 flex flex-col">
          <LiveFeed
            branch_ids={selectedBranchIds}
            departments_ids={selectedDepartmentIds}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
