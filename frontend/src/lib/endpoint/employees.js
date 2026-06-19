import { api, API_BASE } from "@/lib/api-client";

export const updateEmployeeContact = async (payload, id) => {
    return await api.put(`${API_BASE}/employees/${id}/contact-update`, payload);
};