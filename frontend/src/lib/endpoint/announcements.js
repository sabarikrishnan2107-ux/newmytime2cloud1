import { api } from "../api";
import { API_BASE, buildQueryParams } from "../api-client";

export const getAnnouncements = async (params = {}) => {
    const { data } = await api.get(`${API_BASE}/announcement`, { params: await buildQueryParams(params) });
    return data;
};

export const getAnnouncementList = async (params = {}) => {
    const { data } = await api.get(`${API_BASE}/announcement_list`, { params: await buildQueryParams(params) });
    return data;
};

export const storeAnnouncement = async (payload = {}) => {
    const { data } = await api.post(`${API_BASE}/announcement`, payload);
    return data;
};

export const updateAnnouncement = async (id, payload = {}) => {
    const { data } = await api.put(`${API_BASE}/announcement/${id}`, payload);
    return data;
};

export const deleteAnnouncement = async (id) => {
    const { data } = await api.delete(`${API_BASE}/announcement/${id}`);
    return data;
};

export const deleteSelectedAnnouncements = async (ids = []) => {
    const { data } = await api.post(`${API_BASE}/announcement/delete/selected`, { ids });
    return data;
};

export const getAnnouncementCategories = async (params = {}) => {
    const { data } = await api.get(`${API_BASE}/announcements_category`, { params: await buildQueryParams(params) });
    return data;
};

export const getEmployeesByDepartmentForAnnouncements = async (params = {}) => {
    const { data } = await api.get(`${API_BASE}/employeesByDepartmentForAnnoucements`, { params: await buildQueryParams(params) });
    return data;
};
