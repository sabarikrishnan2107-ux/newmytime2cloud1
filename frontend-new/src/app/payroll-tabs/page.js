"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import PayrollFormula from "@/components/PayrollTabs/Formula/Page";
import GenerationDate from "@/components/PayrollTabs/GenerationDate/Page";
import { useTranslation } from "react-i18next";


const DepartmentTabs = () => {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="payroll_formula" className="w-full">
      {/* --- Tabs Header aligned Right --- */}
      <div className="flex justify-end mb-4">
        <TabsList className="flex bg-white shadow-sm border rounded-lg p-1">
          <TabsTrigger
            value="payroll_generate_date"
            className="px-4 py-2 text-sm font-medium rounded-md 
              data-[state=active]:bg-primary/10 
              data-[state=active]:text-primary 
              data-[state=active]:shadow-sm 
              transition-all duration-200"
          >
            {t("payroll.tabs.generationDate.label")}
          </TabsTrigger>

          <TabsTrigger
            value="payroll_formula"
            className="px-4 py-2 text-sm font-medium rounded-md 
              data-[state=active]:bg-primary/10 
              data-[state=active]:text-primary 
              data-[state=active]:shadow-sm 
              transition-all duration-200"
          >
            {t("payroll.tabs.formula.label")}
          </TabsTrigger>
        </TabsList>
      </div>

      {/* --- Tabs Content --- */}
      <div className="rounded-xl  py-6">
        <TabsContent value="payroll_generate_date" className="space-y-2">
          <GenerationDate />
        </TabsContent>
        <TabsContent value="payroll_formula" className="space-y-2">
          <PayrollFormula />
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default DepartmentTabs;
