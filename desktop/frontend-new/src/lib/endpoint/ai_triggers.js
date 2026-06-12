import { api, API_BASE, buildQueryParams } from "@/lib/api-client";


// src/lib/endpoint/leaves.js additions
export const getAiTriggers = async (params = {}) => {
    let baseURL = API_BASE;
    const { data } = await api.get(`${baseURL}/ai-triggers`, { params: await buildQueryParams(params) });
    return data;
};

export const deleteItem = async (id) => {
    let baseURL = API_BASE;
    const { data } = await api.delete(`${baseURL}/ai-triggers/${id}`);
    return data;
};

export const createAITrigger = async (payload = {}) => {
    let baseURL = API_BASE;
    const { data } = await api.post(`${baseURL}/ai-triggers`, payload);
    return data;
};



// export const createLeave = async (id, payload = {}) => {
//     let baseURL = API_BASE;
//     const params = await buildQueryParams();
//     const { data } = await api.post(`${baseURL}/employee_leaves`, payload, { params });
//     return data;
// };

