export const updateReportNotification = async (id, payload = {}) => {
    const { data } = await api.put(`/report_notification/${id}`, payload);
    return data;
};
import { api, buildQueryParams } from "@/lib/api-client";

export const getReportNotifications = async (params = {}) => {
    const { data } = await api.get(`/report_notification`, { params: await buildQueryParams(params) });
    return data;
};

export const storeReportNotification = async (payload = {}) => {
    const { data } = await api.post(`/report_notification`, payload);
    return data;
};

export const deleteReportNotification = async (id) => {
    const { data } = await api.delete(`/report_notification/${id}`);
    return data;
};

export const testFtpConnection = async (cfg = {}) => {
    const { data } = await api.post(`/automation/test-ftp`, cfg);
    return data;
};

export const testApiConnection = async (cfg = {}) => {
    const { data } = await api.post(`/automation/test-api`, cfg);
    return data;
};