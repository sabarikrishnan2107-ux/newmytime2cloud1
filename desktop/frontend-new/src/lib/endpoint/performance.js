import { api, buildQueryParams } from "@/lib/api-client";

export const getPerformanceReport = async (payload = {}) => {
    const params = await buildQueryParams();
    const { data } = await api.post("/performance-report", {
        ...payload,
        ...params,
        report_type: "monthly",
    });
    return data;
};

export const getPerformanceReportSingle = async (payload = {}) => {
    const params = await buildQueryParams();
    const { data } = await api.post("/performance-report", {
        ...payload,
        ...params,
        report_type: "monthly",
    });
    return data;
};
