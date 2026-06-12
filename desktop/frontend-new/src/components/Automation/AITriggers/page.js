"use client";

import React, { useState, useEffect } from "react";
import Pagination from "@/lib/Pagination";
import DataTable from "@/components/ui/DataTable";
import Columns from "./columns";
import Create from "./Create";
import { notify, parseApiError } from "@/lib/utils";
import { getAiTriggers } from "@/lib/endpoint/ai_triggers";

export default function AITriggers() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchRecords();
  }, [currentPage, perPage]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getAiTriggers({
        page: currentPage,
        per_page: perPage,
      });

      console.log(`getAiTriggers`);
      console.log(result);


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


  return (
    <>
      <div
        className="p-5 border-gray-200 dark:border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-white text-lg">AI Triggers</h3>
        </div>
        <div className="flex items-center gap-3">
          <Create onSuccess={fetchRecords} />
        </div>
      </div>

      <DataTable
        columns={Columns({ onSuccess: fetchRecords })}
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
  )
}
