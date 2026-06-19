"use client";

import React, { useState, useEffect } from "react";
import { getAdmins } from "@/lib/api";

import Pagination from "@/lib/Pagination";
import DataTable from "@/components/ui/DataTable";
import Columns from "./columns";
import Create from "@/components/Company/Admin/Create";
import { useRouter } from "next/navigation";
import { parseApiError } from "@/lib/utils";
import { SuccessDialog } from "@/components/SuccessDialog";

let pageTitle = "Admin";

export default function Branch() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sucessObject, setSucessObject] = useState({ title: "", description: "" });
  const [successOpen, setSuccessOpen] = useState(false);


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
  }, [currentPage, perPage]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getAdmins({
        page: currentPage,
        per_page: perPage,
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
    pageTitle: pageTitle
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between mb-6">
        <div className="flex flex-wrap items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            {pageTitle} {successOpen}
          </h2>
        </div>

        <Create pageTitle={pageTitle} onSuccess={handleSuccess} />

        <SuccessDialog
          open={successOpen}
          onOpenChange={setSuccessOpen}
          title={sucessObject.title}
          description={sucessObject.description}
        />
      </div>

      <DataTable
        className="bg-slate-50 overflow-hidden min-h-[300px]"
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
