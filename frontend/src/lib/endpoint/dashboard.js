import { api, buildQueryParams } from "@/lib/api-client";

export const getAttendanceCount = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/dashbaord_attendance_count", { params: queryParams });
    return data;
};

export const getPresentEmployees = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/dashboard_present_employees", { params: queryParams });
    return data;
};

export const getAbsentEmployees = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/dashboard_absent_employees", { params: queryParams });
    return data;
};

export const dashboardGetCountslast7DaysChart = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/dashboard_counts_last_7_days_chart", { params: queryParams });
    return data;
};

export const getCompanyStats = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/company_stats", { params: queryParams });
    return data;
};

export const getCompanyStatsHourlyTrends = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/company_stats_hourly_trends", { params: queryParams });
    return data;
};

export const getCompanyStatsDayTrends = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/company_stats_day_trends", { params: queryParams });
    return data;
};

export const getCompanyStatsDepartmentBreakdown = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/company_stats_department_breakdown", { params: queryParams });
    return data;
};

export const getCompanyStatsPunctuality = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/company_stats_punctuality", { params: queryParams });
    return data;
};

export const getCompanyStatsDailyAttendance = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/company_stats_daily_attendance", { params: queryParams });
    return data;
};

export const downloadCompanyStatsSummaryPdf = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const response = await api.get("/company_stats_summary_pdf", {
        params: queryParams,
        responseType: "blob",
    });
    return response;
};

export const getCompanyStatsSummaryPayload = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/company_stats_summary_payload", { params: queryParams });
    return data;
};

export const getAIFeeds = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/ai-feeds", { params: queryParams });
    return data;
};

export const getWeeklyBirthdays = async (params = {}) => {
    const queryParams = await buildQueryParams(params);
    const { data } = await api.get("/ai-feeds-weekly-birthdays", { params: queryParams });
    return data;
};
