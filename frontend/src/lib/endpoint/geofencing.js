import { api } from "@/lib/api-client";

export const updateGeoFencing = async (id, payload = {}) => {
    const { data } = await api.put(`/branch-update-geofencing/${id}`, payload);
    return data;
};

export const branchListGeoFencing = async (companyId) => {
    const { data } = await api.get(`/branch-list-for-geofencing/${companyId}`);
    return data;
};
