import { api, API_BASE, buildQueryParams } from "@/lib/api-client";

export const getLeavesRequest = async (params = {}) => {
    let baseURL = API_BASE;
    // baseURL = `https://backend.mytime2cloud.com/api`;
    const { data } = await api.get(`${baseURL}/employee_leaves`, { params: await buildQueryParams(params) });
    return data;
};

export const getLeavesGroups = async (leaveGroupId, params = {}) => {
    let baseURL = API_BASE;
    const { data } = await api.get(`${baseURL}/leave_groups/${leaveGroupId}`, { params: await buildQueryParams(params) });
    return data;
};

// src/lib/endpoint/leaves.js additions
export const getUpcomingLeaves = async (params = {}) => {
    let baseURL = API_BASE;
    const { data } = await api.get(`${baseURL}/employee_leaves_for_next_thirty_days_month`, { params: await buildQueryParams(params) });
    return data;
};

export const getLeavesEvents = async (params = {}) => {
    let baseURL = API_BASE;
    const { data } = await api.get(`${baseURL}/employee_leaves_events`, { params: await buildQueryParams(params) });
    return data;
};

export const approveLeave = async (id, payload = {}) => {
    let baseURL = API_BASE;
    const { data } = await api.post(`${baseURL}/employee_leaves/approve/${id}`, payload);
    return data;
};

export const rejectLeave = async (id, params = {}) => {
    let baseURL = API_BASE;
    const { data } = await api.get(`${baseURL}/employee_leaves/reject/${id}`, { params: await buildQueryParams(params) });
    return data;
};

export const createLeave = async (id, payload = {}) => {
    let baseURL = API_BASE;
    const params = await buildQueryParams();
    const { data } = await api.post(`${baseURL}/employee_leaves`, payload, { params });
    return data;
};


export const uploadLeaveDocuments = async (leaveId, employeeId, documents = []) => {
    let baseURL = API_BASE;
    const params = await buildQueryParams();

    const formData = new FormData();
    formData.append("company_id", params.company_id);
    formData.append("leave_id", leaveId);
    formData.append("employee_id", employeeId);

    documents.forEach((doc, index) => {
        formData.append(`items[${index}][key]`, doc.title);
        formData.append(`items[${index}][value]`, doc.file);
    });

    const { data } = await api.post(`${baseURL}/employee_document`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
};

export const getLeaveDocuments = async (params = {}) => {
    let baseURL = API_BASE;
    const { data } = await api.get(`${baseURL}/employee_document`, { params: await buildQueryParams(params) });
    return data;
};

export const getLeaveTypesByGroupId = async (id, params = {}) => {
    let baseURL = API_BASE;
    const { data } = await api.get(`${baseURL}/leave_groups/${id}`, { params: await buildQueryParams(params) });
    return data[0].leave_count;
};
