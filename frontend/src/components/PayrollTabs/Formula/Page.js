"use client";

import React, { useState, useEffect } from "react";
import { getBranches, getPayrollFormula } from "@/lib/api";

import Pagination from "@/lib/Pagination";
import DataTable from "@/components/ui/DataTable";
import Columns from "./columns";
import Create from "@/components/PayrollTabs/Formula/Create";
import { useRouter } from "next/navigation";
import { parseApiError } from "@/lib/utils";
import { SuccessDialog } from "@/components/SuccessDialog";
import DropDown from "@/components/ui/DropDown";
import { useTranslation } from "react-i18next";

export default function GroupLogin() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sucessObject, setSucessObject] = useState({ title: "", description: "" });

  const [successOpen, setSuccessOpen] = useState(false);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState([]);

  const fetchBranches = async () => {
    try {
      setBranches(await getBranches());
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  useEffect(() => {
    fetchBranches();
  },[]);


  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  const handleSuccess = (e) => {
    setSuccessOpen(true);
    setSucessObject(e);
    fetchRecords();
  }

  useEffect(() => {
    fetchRecords();
  }, [currentPage, perPage, selectedBranchId]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getPayrollFormula({
        page: currentPage,
        per_page: perPage,
        branch_id: selectedBranchId,
      });

      if (result && Array.isArray(result.data)) {
        setRecords(result.data);
        setCurrentPage(result.current_page || 1);
        setTotal(result.total || 0);
      } else {
        throw new Error("Invalid data structure from API.");
      }
    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const router = useRouter();

  const handleRowClick = (employee) => {
    console.log(employee);
    // You can customize per row
    router.push(`/branch/short-list`);
  };

  const columns = Columns({
    onSuccess: handleSuccess,
    handleRowClick: handleRowClick,
    pageTitle: t("payroll.tabs.formula.label"),
    t,
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between mb-6">
        <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center">
            {t("payroll.tabs.formula.label")}
          </h2>

          <div className="flex flex-col">
            <DropDown
              placeholder={t("payroll.tabs.chooseBranch")}
              value={selectedBranchId}
              items={[{ id: null, name: t("payroll.tabs.selectAll") }, ...branches]}
              onChange={setSelectedBranchId}
            />
          </div>
        </div>
        <Create pageTitle={t("payroll.tabs.formula.label")} onSuccess={handleSuccess} />

        <SuccessDialog
          open={successOpen}
          onOpenChange={setSuccessOpen}
          title={sucessObject.title}
          description={sucessObject.description}
        />
      </div>

      <DataTable
        className="bg-slate-50 overflow-hidden min-h-[700px]"
        columns={columns}
        data={records}
        isLoading={isLoading}
        error={error}
        pagination={
          <Pagination
            page={currentPage}
            perPage={perPage}
            total={total}
            onPageChange={setCurrentPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        }
      />


    </>
  );
}
