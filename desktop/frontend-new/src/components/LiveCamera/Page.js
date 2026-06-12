"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBranches } from "@/lib/api";
import { getCameras } from "@/lib/endpoint/live-camera";
import { notify, parseApiError } from "@/lib/utils";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/lib/Pagination";
import MultiDropDown from "@/components/ui/MultiDropDown";
import Columns from "./columns";

export default function LiveCameraPage() {
  const router = useRouter();

  const [branches, setBranches] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedBranchIds, setSelectedBranchIds] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranches(await getBranches());
      } catch (error) {
        setError(parseApiError(error));
      }
    };
    fetchBranches();
  }, []);

  const fetchRecords = useCallback(async (page, perPage) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: page,
        per_page: perPage,
        branch_ids: selectedBranchIds.length > 0 ? selectedBranchIds : [],
      };
      const result = await getCameras(params);

      if (result && Array.isArray(result.data)) {
        setCameras(result.data);
        setCurrentPage(result.current_page || 1);
        setTotal(result.total || 0);
      } else {
        throw new Error("Invalid data structure received from API.");
      }
    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [perPage, selectedBranchIds]);

  useEffect(() => {
    fetchRecords(currentPage, perPage);
  }, [currentPage, perPage, fetchRecords]);

  const handleView = (deviceId) => {
    router.push(`/live-camera/stream?id=${deviceId}`);
  };

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:space-y-0">
        <h1 className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 flex items-center">
          Live Camera
        </h1>
        <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
          <div className="relative">
            <MultiDropDown
              placeholder={"Select Branch"}
              items={branches}
              value={selectedBranchIds}
              onChange={setSelectedBranchIds}
              badgesCount={1}
              width="w-[220px]"
            />
          </div>
          <button
            onClick={() => {
              if (cameras.length > 0) {
                router.push(`/live-camera/register?id=${cameras[0].id}`);
              }
            }}
            disabled={cameras.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">face</span>
            Register Face
          </button>
        </div>
      </div>

      <DataTable
        columns={Columns(handleView)}
        data={cameras}
        isLoading={isLoading}
        error={error}
        onRowClick={(item) => handleView(item.id)}
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
    </div>
  );
}
