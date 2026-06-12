import { api } from "../api";
import { API_BASE, buildQueryParams } from "../api-client";
import { svcUrl } from "../runtimeHost";

const SYNC_CALENDAR_URL =
    process.env.NEXT_PUBLIC_SYNC_CALENDAR_URL || svcUrl("http", 4000);

export const getGoogleHolidays = async (selectedYear) => {
    const { data } = await api.get(`${SYNC_CALENDAR_URL}/holidays/${selectedYear}`);
    return data;
};

export const getHolidays = async (params = {}) => {
    let baseURL = API_BASE;
    // baseURL = `https://backend.mytime2cloud.com/api`;
    const { data } = await api.get(`${baseURL}/holidays`, { params: await buildQueryParams(params) });
    return data;
};

export const storeHolidays = async (payload = {}) => {
    let baseURL = API_BASE;
    // baseURL = `https://backend.mytime2cloud.com/api`;
    await api.post(`${baseURL}/holidays`, payload);
    return true;
};

export const updateHolidays = async (id, payload = {}) => {
    let baseURL = API_BASE;
    // baseURL = `https://backend.mytime2cloud.com/api`;
    await api.put(`${baseURL}/holidays/${id}`, payload);
    return true;
};

export const deleteHolidays = async (id) => {
    let baseURL = API_BASE;
    // baseURL = `https://backend.mytime2cloud.com/api`;
    await api.delete(`${baseURL}/holidays/${id}`);
    return true;
};

export const getEmployeeGovernmentHolidays = async (employeeId, params = {}) => {
    const { data } = await api.get(`${API_BASE}/employee/${employeeId}/government-holidays`, { params });
    return data;
};

export const saveEmployeeGovernmentHolidays = async (employeeId, payload) => {
    const { data } = await api.post(`${API_BASE}/employee/${employeeId}/government-holidays`, payload);
    return data;
};

export const resetEmployeeGovernmentHolidays = async (employeeId, params = {}) => {
    const { data } = await api.delete(`${API_BASE}/employee/${employeeId}/government-holidays`, { params });
    return data;
};