import { api, buildQueryParams } from "@/lib/api-client";

export const getAttendanceTabs = async () => {
    const params = await buildQueryParams();
    const { data } = await api.get("/get_attendance_tabs", { params });
    return data;
};

export const startReportGeneration = async (params = {}) => {
    const { data } = await api.get("/start-report-generation", { params: await buildQueryParams(params) });
    return data;
};

export const checkProgress = async () => {
    const { data } = await api.get("/progress", { params: await buildQueryParams() });
    return data;
};

export const changeRequest = async (params = {}) => {
    const { data } = await api.get(`/change_request`, { params: await buildQueryParams(params) });
    return data;
};

export const updateRequest = async (id, payload = {}) => {
    const { data } = await api.post(`/update-change-request/${id}`, payload);
    return data;
};

export const generateManualLog = async (payload = {}) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value);
        }
    });
    const { data } = await api.post(`/generate_log`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
};

export const getEmployeeRelatedShift = async (employee_id) => {
    const { data } = await api.get(`/employee_related_shift/${employee_id}`, {
        params: await buildQueryParams(),
    });
    return data?.record || null;
};